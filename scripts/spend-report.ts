/**
 * What the AI calls cost per downloaded photo, from the ai_spend table, next to what a photo sells for.
 *
 *   npm run spend                 (last 30 days)
 *   npm run spend -- --days 7 --usd-inr 88
 *
 * fal fill cost is exact (billed per megapixel). The other calls are priced from these settings in .env,
 * per call in US dollars, taken from your fal and Google billing pages. Unpriced calls are counted but left out of the totals:
 *   SPEND_FAL_CUTOUT_USD, SPEND_GEMINI_IMAGE_USD, SPEND_GEMINI_CHECK_USD
 */
import "dotenv/config";
import { parseArgs } from "node:util";
import { and, eq, gte, sql } from "drizzle-orm";
import { TOP_UPS } from "../lib/catalog";
import { db } from "../lib/db";
import { aiSpend, creditLedger } from "../lib/db/schema";
import type { PaidCall } from "../lib/pipeline/usage";

const { values } = parseArgs({
  options: {
    days: { type: "string", default: "30" },
    /** Rupees per US dollar. Check today's rate. */
    "usd-inr": { type: "string", default: "88" },
  },
});
const days = Number(values.days);
const usdInr = Number(values["usd-inr"]);

const price = (name: string) => (process.env[name] ? Number(process.env[name]) : null);
const PRICES: Record<Exclude<PaidCall, "fal-fill">, number | null> = {
  "fal-cutout": price("SPEND_FAL_CUTOUT_USD"),
  "gemini-image": price("SPEND_GEMINI_IMAGE_USD"),
  "gemini-check": price("SPEND_GEMINI_CHECK_USD"),
};

async function main() {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      kind: aiSpend.kind,
      n: sql<number>`count(*)::int`,
      falFillUsd: sql<number>`coalesce(sum(${aiSpend.falFillUsd}), 0)::float`,
      falFill: sql<number>`coalesce(sum((${aiSpend.calls}->>'fal-fill')::int), 0)::int`,
      falCutout: sql<number>`coalesce(sum((${aiSpend.calls}->>'fal-cutout')::int), 0)::int`,
      geminiImage: sql<number>`coalesce(sum((${aiSpend.calls}->>'gemini-image')::int), 0)::int`,
      geminiCheck: sql<number>`coalesce(sum((${aiSpend.calls}->>'gemini-check')::int), 0)::int`,
    })
    .from(aiSpend)
    .where(gte(aiSpend.at, since))
    .groupBy(aiSpend.kind);
  const [{ downloads }] = await db
    .select({ downloads: sql<number>`coalesce(sum(-${creditLedger.credits}), 0)::int` })
    .from(creditLedger)
    .where(and(eq(creditLedger.kind, "download"), gte(creditLedger.at, since)));

  const unpriced = new Set<string>();
  const cost = (r: (typeof rows)[number]) => {
    let usd = r.falFillUsd;
    const counts: [keyof typeof PRICES, number][] = [["fal-cutout", r.falCutout], ["gemini-image", r.geminiImage], ["gemini-check", r.geminiCheck]];
    for (const [call, n] of counts) {
      const p = PRICES[call];
      if (p === null) {
        if (n > 0) unpriced.add(call);
      } else usd += n * p;
    }
    return usd;
  };
  const rupees = (usd: number) => `₹${(usd * usdInr).toFixed(2)}`;

  console.log(`Last ${days} days (₹${usdInr} per US dollar)\n`);
  let totalUsd = 0;
  for (const r of rows) {
    const usd = cost(r);
    totalUsd += usd;
    console.log(
      `${r.kind === "check" ? "Photo checks" : "Previews"}: ${r.n}, cost ${rupees(usd)}, ${rupees(usd / r.n)} each` +
        `  [fal fill ${r.falFill}, fal cutout ${r.falCutout}, Gemini image ${r.geminiImage}, Gemini checks ${r.geminiCheck}]`,
    );
  }
  if (rows.length === 0) console.log("No photo checks or previews recorded yet.");
  console.log(`\nTotal AI cost: ${rupees(totalUsd)}`);
  console.log(`Photos downloaded: ${downloads} (welcome photos included, so some earned nothing)`);
  if (downloads > 0) {
    const per = (totalUsd * usdInr) / downloads;
    const low = Math.min(...TOP_UPS.map((t) => t.perPhoto));
    const high = Math.max(...TOP_UPS.map((t) => t.perPhoto));
    console.log(`AI cost per downloaded photo: ₹${per.toFixed(2)}. A photo sells for ₹${low}-${high}, so AI takes ${((per / high) * 100).toFixed(0)}-${((per / low) * 100).toFixed(0)}% of the price.`);
  }
  if (unpriced.size) console.log(`\nNot priced, so left out of the costs above: ${[...unpriced].join(", ")}. Set the SPEND_* settings in .env (see the top of this file).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
