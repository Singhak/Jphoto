/**
 * Makes the sample photos shown on the look cards in the studio, using the real pipeline,
 * so every card shows what Jphoto actually produces (a real model wearing a real piece).
 *
 *   npm run samples                                   (model looks for every photo in samples/input)
 *   npm run samples -- --styles model-bridal,marble   (only these looks)
 *
 * Put one photo per piece in samples/input, named by piece type (e.g. "ring.jpg", "necklace_2.jpg").
 * Use pieces you own the rights to show publicly: these images are served to every visitor.
 * Only shots that pass every check are kept. Saves to public/samples and records them in lib/samples.json.
 */
import "dotenv/config";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import sharp from "sharp";
import { extractJewellery, PIECE_TYPES, type PieceType, renderShot, STYLES, stylesFor, usageSummary } from "../lib/pipeline";

const { values } = parseArgs({
  options: {
    in: { type: "string", default: "samples/input" },
    styles: { type: "string", default: STYLES.filter((s) => s.kind === "model").map((s) => s.id).join(",") },
  },
});

const MANIFEST = "lib/samples.json";
const styleIds = values.styles!.split(",").map((s) => s.trim()).filter(Boolean);
for (const id of styleIds) if (!STYLES.some((s) => s.id === id)) throw new Error(`Unknown style "${id}". Options: ${STYLES.map((s) => s.id).join(", ")}`);

async function main() {
  const files = (await readdir(values.in!).catch(() => [])).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
  if (files.length === 0) {
    console.log(`No photos in ${values.in}. Add one photo per piece, named like ring.jpg or necklace.jpg, and run again.`);
    return;
  }
  const manifest: Record<string, Partial<Record<PieceType, string>>> = JSON.parse(await readFile(MANIFEST, "utf8").catch(() => "{}"));
  let made = 0;

  for (const file of files) {
    const piece = path.parse(file).name.toLowerCase().split(/[_\s]/)[0] as PieceType;
    if (!PIECE_TYPES.includes(piece)) {
      console.log(`skip ${file}: name it after the piece (${PIECE_TYPES.join(", ")})`);
      continue;
    }
    console.log(`\n${file} (${piece})`);
    const cutout = await extractJewellery(await readFile(path.join(values.in!, file)), { piece });
    if (cutout.problems.length) {
      console.log(`  x photo not usable: ${cutout.problems.join(" ")}`);
      continue;
    }
    const fits = new Set(stylesFor(piece).map((s) => s.id));
    for (const styleId of styleIds.filter((id) => fits.has(id))) {
      try {
        const shot = await renderShot(cutout, piece, styleId);
        if (!shot.accepted) {
          console.log(`  FAIL ${styleId}: ${shot.rejectReasons.join(" | ")}`);
          continue;
        }
        const rel = `/samples/${styleId}/${piece}.jpg`;
        await mkdir(path.join("public", "samples", styleId), { recursive: true });
        // Cards are small; 600px wide keeps the page light.
        await writeFile(path.join("public", rel), await sharp(shot.png).resize({ width: 600 }).jpeg({ quality: 84 }).toBuffer());
        (manifest[styleId] ??= {})[piece] = rel;
        made++;
        console.log(`  ok   ${styleId} -> public${rel}`);
      } catch (err) {
        console.log(`  x ${styleId}: ${(err as Error).message.split("\n")[0].slice(0, 200)}`);
      }
    }
  }

  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  const u = usageSummary();
  console.log(`\n${made} sample(s) saved. Paid calls: fal fill ${u["fal-fill"]} ($${u.falFillUsd.toFixed(2)}), Gemini image ${u["gemini-image"]}, Gemini checks ${u["gemini-check"]}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
