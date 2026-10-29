import { readFile } from "node:fs/promises";
import path from "node:path";
import hbReady from "harfbuzzjs";

/**
 * Hindi, Gujarati, Tamil and the other Indian scripts in server-made PDFs. pdf-lib can't join conjuncts or
 * reorder vowel signs (कि, क्ष), so these runs are shaped by HarfBuzz, the engine browsers use, and drawn as
 * outlines. Latin text stays with pdf-lib's own fonts.
 */

const SCRIPTS: { name: string; from: number; to: number }[] = [
  { name: "Devanagari", from: 0x0900, to: 0x097f },
  { name: "Bengali", from: 0x0980, to: 0x09ff },
  { name: "Gurmukhi", from: 0x0a00, to: 0x0a7f },
  { name: "Gujarati", from: 0x0a80, to: 0x0aff },
  { name: "Oriya", from: 0x0b00, to: 0x0b7f },
  { name: "Tamil", from: 0x0b80, to: 0x0bff },
  { name: "Telugu", from: 0x0c00, to: 0x0c7f },
  { name: "Kannada", from: 0x0c80, to: 0x0cff },
  { name: "Malayalam", from: 0x0d00, to: 0x0d7f },
];

/** Joiners and danda marks belong to whichever Indian script is around them. */
const SHARED = new Set([0x200c, 0x200d, 0x0964, 0x0965]);

const scriptOf = (ch: string) => {
  const cp = ch.codePointAt(0)!;
  return SCRIPTS.find((s) => cp >= s.from && cp <= s.to)?.name ?? null;
};

export interface Run {
  text: string;
  /** null: Latin and everything else, drawn with pdf-lib's fonts. */
  script: string | null;
}

/** Splits text into same-script runs. Spaces stay with the run they're in, so a Hindi phrase is shaped as one. */
export function splitRuns(s: string): Run[] {
  const runs: Run[] = [];
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    const prev = runs[runs.length - 1];
    const script = ch === " " || SHARED.has(cp) ? (prev?.script ?? null) : scriptOf(ch);
    if (prev && prev.script === script) prev.text += ch;
    else runs.push({ text: ch, script });
  }
  return runs;
}

export const hasIndic = (s: string) => splitRuns(s).some((r) => r.script);

export interface ShapedGlyph {
  /** SVG path in font units, y pointing down, for pdf-lib's drawSvgPath. */
  path: string;
  x: number;
  y: number;
}

export interface Shaper {
  upem: number;
  shape(text: string): { glyphs: ShapedGlyph[]; advance: number };
}

let shapers: Promise<Map<string, Shaper>> | null = null;

/** One HarfBuzz font per script, made once per server. */
export function loadShapers() {
  return (shapers ??= (async () => {
    const hb = await hbReady;
    const out = new Map<string, Shaper>();
    for (const { name } of SCRIPTS) {
      const bytes = await readFile(path.join(process.cwd(), "lib", "fonts", `NotoSans${name}-Regular.ttf`));
      const face = hb.createFace(hb.createBlob(new Uint8Array(bytes)), 0);
      const font = hb.createFont(face);
      const paths = new Map<number, string>();
      const glyphPath = (g: number) => {
        let p = paths.get(g);
        if (p === undefined) {
          // Font outlines point y up; flip them for SVG.
          p = font
            .glyphToJson(g)
            .map(({ type, values }) => type + values.map((v, i) => (i % 2 ? -v : v)).join(" "))
            .join("");
          paths.set(g, p);
        }
        return p;
      };
      out.set(name, {
        upem: face.upem,
        shape(text) {
          const buf = hb.createBuffer();
          buf.addText(text);
          buf.guessSegmentProperties();
          hb.shape(font, buf);
          const glyphs: ShapedGlyph[] = [];
          let pen = 0;
          for (const g of buf.json()) {
            glyphs.push({ path: glyphPath(g.g), x: pen + g.dx, y: g.dy });
            pen += g.ax;
          }
          buf.destroy();
          return { glyphs, advance: pen };
        },
      });
    }
    return out;
  })());
}
