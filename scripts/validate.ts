/**
 * Phase 0 validation: run real jewellers' photos through the pipeline and produce
 * side-by-side images to show them, plus a CSV of every quality check.
 *
 *   npm run validate -- --in validation/input --out validation/output --styles studio-white,velvet-maroon,model-bridal
 *   npm run validate -- --styles velvet-maroon --engine gemini      (compare engines on the same style)
 *
 * Piece type comes from the filename prefix (e.g. "necklace_sharma-01.jpg"), or --piece as the default.
 * Rejected shots are saved too (as *_REJECTED.png) so you can see what the checks caught.
 */
import "dotenv/config";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { extractJewellery, PIECE_TYPES, type PieceType, renderShot, sideBySide, STYLES, usageSummary } from "../lib/pipeline";

const { values } = parseArgs({
  options: {
    in: { type: "string", default: "validation/input" },
    out: { type: "string", default: "validation/output" },
    styles: { type: "string", default: "studio-white,velvet-maroon,marble" },
    piece: { type: "string", default: "necklace" },
    engine: { type: "string" },
    "no-judge": { type: "boolean", default: false },
    /** Skip the Gemini step that removes props (fingers, pens, stands) and redraws hidden parts. */
    "no-complete": { type: "boolean", default: false },
    /** Generate even when the photo checks fail (to see what a bad photo produces). */
    force: { type: "boolean", default: false },
    seed: { type: "string" },
  },
});

const styleIds = values.styles!.split(",").map((s) => s.trim()).filter(Boolean);
for (const id of styleIds) if (!STYLES.some((s) => s.id === id)) throw new Error(`Unknown style "${id}". Options: ${STYLES.map((s) => s.id).join(", ")}`);
if (values.engine && values.engine !== "fill" && values.engine !== "gemini") throw new Error('--engine must be "fill" or "gemini"');

function pieceFor(file: string): PieceType {
  const prefix = path.parse(file).name.toLowerCase().split(/[_\s]/)[0];
  if ((PIECE_TYPES as readonly string[]).includes(prefix)) return prefix as PieceType;
  if (!(PIECE_TYPES as readonly string[]).includes(values.piece!)) throw new Error(`--piece must be one of ${PIECE_TYPES.join(", ")}`);
  return values.piece as PieceType;
}

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const fmtPsnr = (psnr: number) => (Number.isFinite(psnr) ? psnr.toFixed(1) : "inf");

async function main() {
  const files = (await readdir(values.in!)).filter((f) => /\.(jpe?g|png|webp|heic)$/i.test(f)).sort();
  if (files.length === 0) {
    console.log(`No photos found in ${values.in}. Add jewellers' photos there (e.g. necklace_shop1-01.jpg) and run again.`);
    return;
  }
  await mkdir(values.out!, { recursive: true });
  const header = ["photo", "piece", "style", "engine", "accepted", "attempts", "psnr_db", "align", "judge_score", "removed_pct", "redrawn_pct", "seconds", "sharpness", "reject_reasons", "photo_problems", "photo_warnings", "error"];
  const rows: string[][] = [header];
  const row = (r: Partial<Record<(typeof header)[number], unknown>>) => rows.push(header.map((h) => String(r[h] ?? "")));

  for (const file of files) {
    const name = path.parse(file).name;
    const piece = pieceFor(file);
    const dir = path.join(values.out!, name);
    await mkdir(dir, { recursive: true });
    console.log(`\n${file} (${piece})`);
    const original = await readFile(path.join(values.in!, file));

    let cutout;
    try {
      cutout = await extractJewellery(original, { piece, complete: values["no-complete"] ? false : undefined });
      await writeFile(path.join(dir, "cutout.png"), cutout.png);
      if (cutout.completion) {
        const c = cutout.completion;
        await writeFile(path.join(dir, "cutout_raw.png"), cutout.rawPng);
        console.log(`  completion: ${(c.removed * 100).toFixed(1)}% removed as props, ${(c.reconstructed * 100).toFixed(1)}% redrawn by AI, align ${c.alignScore.toFixed(2)}`);
      }
      for (const w of cutout.warnings) console.log(`  ! ${w}`);
      for (const p of cutout.problems) console.log(`  x ${p}`);
    } catch (err) {
      console.log(`  x cutout failed: ${(err as Error).message}`);
      row({ photo: file, piece, style: "-", accepted: false, error: (err as Error).message });
      continue;
    }
    const c = cutout.completion;
    const photoInfo = { removed_pct: c && (c.removed * 100).toFixed(1), redrawn_pct: c && (c.reconstructed * 100).toFixed(1), sharpness: cutout.quality.sharpness.toFixed(0), photo_problems: cutout.problems.join(" "), photo_warnings: cutout.warnings.join(" ") };
    if (cutout.problems.length && !values.force) {
      // In the app this is where the jeweller is asked to retake the photo, before any credit is used.
      row({ photo: file, piece, style: "-", accepted: false, ...photoInfo });
      continue;
    }

    for (const styleId of styleIds) {
      const started = Date.now();
      try {
        const shot = await renderShot(cutout, piece, styleId, {
          engine: values.engine as "fill" | "gemini" | undefined,
          judge: values["no-judge"] ? false : undefined,
          seed: values.seed ? Number(values.seed) : undefined,
        });
        const seconds = ((Date.now() - started) / 1000).toFixed(1);
        const base = shot.accepted ? styleId : `${styleId}_REJECTED`;
        await writeFile(path.join(dir, `${base}.png`), shot.png);
        await writeFile(path.join(dir, `${base}_compare.jpg`), await sideBySide(original, shot.png));
        const checks = [
          `PSNR ${fmtPsnr(shot.fidelity.psnr)}`,
          shot.alignScore !== undefined && `align ${shot.alignScore.toFixed(2)}`,
          shot.judge && `judge ${shot.judge.score}/10`,
        ].filter(Boolean).join(", ");
        console.log(`  ${shot.accepted ? "ok  " : "FAIL"} ${styleId} [${shot.engine}] ${checks}, ${shot.attempts} attempt(s), ${seconds}s`);
        if (!shot.accepted) console.log(`       ${shot.rejectReasons.join(" | ")}`);
        row({
          photo: file, piece, style: styleId, engine: shot.engine, accepted: shot.accepted, attempts: shot.attempts,
          psnr_db: fmtPsnr(shot.fidelity.psnr), align: shot.alignScore?.toFixed(3), judge_score: shot.judge?.score,
          seconds, reject_reasons: shot.rejectReasons.join(" | "), ...photoInfo,
        });
      } catch (err) {
        console.log(`  x ${styleId}: ${(err as Error).message}`);
        row({ photo: file, piece, style: styleId, accepted: false, error: (err as Error).message, ...photoInfo });
      }
    }
  }

  const reportPath = path.join(values.out!, "report.csv");
  await writeFile(reportPath, rows.map((r) => r.map(csvCell).join(",")).join("\n"));
  const shots = rows.slice(1).filter((r) => r[2] !== "-");
  const accepted = shots.filter((r) => r[4] === "true");
  const attempts = shots.reduce((n, r) => n + (Number(r[5]) || 0), 0);
  const blocked = rows.slice(1).filter((r) => r[2] === "-").length;
  console.log(`\n${accepted.length}/${shots.length} shots accepted using ${attempts} generations. ${blocked} photo(s) blocked before generation.`);
  const u = usageSummary();
  console.log(
    `Paid calls: fal fill ${u["fal-fill"]} ($${u.falFillUsd.toFixed(2)}), fal cutout ${u["fal-cutout"]}, ` +
      `Gemini image ${u["gemini-image"]}, Gemini checks ${u["gemini-check"]} (see your Google billing page for Gemini cost).`,
  );
  console.log(`Report: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
