/** The parts of harfbuzzjs (HarfBuzz compiled to WebAssembly) that lib/indic-text.ts uses. */
declare module "harfbuzzjs" {
  interface HbGlyph {
    g: number;
    cl: number;
    ax: number;
    ay: number;
    dx: number;
    dy: number;
  }
  interface HbBuffer {
    addText(text: string): void;
    guessSegmentProperties(): void;
    json(): HbGlyph[];
    destroy(): void;
  }
  interface HbFace {
    upem: number;
  }
  interface HbFont {
    glyphToJson(glyph: number): { type: string; values: number[] }[];
  }
  interface HarfBuzz {
    createBlob(data: ArrayBuffer | Uint8Array): unknown;
    createFace(blob: unknown, index: number): HbFace;
    createFont(face: HbFace): HbFont;
    createBuffer(): HbBuffer;
    shape(font: HbFont, buffer: HbBuffer, features?: string): void;
  }
  const hb: Promise<HarfBuzz>;
  export = hb;
}
