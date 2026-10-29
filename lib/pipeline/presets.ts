export const PIECE_TYPES = ["necklace", "necklace-set", "chain", "earring", "ring", "bangle", "kada", "bracelet", "pendant", "maang-tikka", "nose-pin", "payal"] as const;
export type PieceType = (typeof PIECE_TYPES)[number];

export type ShotKind = "product" | "model";
export type Wearer = "woman" | "man" | "girl";

/**
 * Pieces each wearer can model. Product shots accept every piece.
 * Necklace sets are product-only until model shots can place the necklace and each earring separately (see set-split.ts).
 */
const WEARABLE: Record<Wearer, readonly PieceType[]> = {
  woman: PIECE_TYPES.filter((p) => p !== "necklace-set"),
  man: ["chain", "necklace", "pendant", "ring", "kada", "bracelet", "earring"],
  girl: ["earring", "chain", "necklace", "pendant", "bangle", "bracelet", "ring", "payal", "maang-tikka"],
};

export interface StylePreset {
  id: string;
  label: string;
  kind: ShotKind;
  /** Model shots only: who wears the piece. */
  wearer?: Wearer;
  /** No AI generation needed: the cutout is placed on a plain background locally. */
  local?: { background: string };
  /** Prompt for the AI scene. The jewellery itself is never described; it is kept from the original photo. */
  prompt?: string;
}

export const STYLES: StylePreset[] = [
  { id: "studio-white", label: "Studio White", kind: "product", local: { background: "#ffffff" } },
  { id: "studio-cream", label: "Studio Cream", kind: "product", local: { background: "#f5efe4" } },
  {
    id: "velvet-maroon",
    label: "Maroon Velvet",
    kind: "product",
    prompt: "luxury jewellery product photograph, item resting on rich maroon velvet cloth, soft studio lighting, gentle contact shadow, shallow depth of field, high-end catalog",
  },
  {
    id: "marble",
    label: "White Marble",
    kind: "product",
    prompt: "luxury jewellery product photograph, item resting on polished white Carrara marble, soft diffused daylight, subtle reflection and contact shadow, minimal premium catalog",
  },
  {
    id: "silk-ivory",
    label: "Ivory Silk",
    kind: "product",
    prompt: "jewellery product photograph, item resting on draped ivory silk fabric with soft folds, warm soft light, gentle shadow, elegant Indian bridal catalog",
  },
  {
    id: "festive",
    label: "Festive",
    kind: "product",
    prompt: "jewellery product photograph on dark wooden surface, warm festive Diwali mood, blurred brass diyas and marigold petals in background bokeh, soft warm light, gentle shadow",
  },
  {
    id: "model-bridal",
    label: "Bridal Model",
    kind: "model",
    wearer: "woman",
    prompt: "photorealistic Indian bride wearing the jewellery, elegant red and gold silk saree, soft natural window light, editorial catalog photograph, sharp focus on the jewellery",
  },
  {
    id: "model-everyday",
    label: "Everyday Model",
    kind: "model",
    wearer: "woman",
    prompt: "photorealistic young Indian woman wearing the jewellery, simple neutral top, clean soft studio background, natural skin texture, soft light, catalog photograph",
  },
  {
    id: "model-groom",
    label: "Groom",
    kind: "model",
    wearer: "man",
    prompt: "photorealistic Indian groom wearing the jewellery, ivory and gold embroidered sherwani, warm wedding light, editorial catalog photograph, sharp focus on the jewellery",
  },
  {
    id: "model-men-everyday",
    label: "Men's Everyday",
    kind: "model",
    wearer: "man",
    prompt: "photorealistic Indian man in his late twenties wearing the jewellery, well-fitted plain black or white shirt with top buttons open, clean soft studio background, natural skin texture, catalog photograph",
  },
  {
    id: "model-girl-festive",
    label: "Girl (Kids)",
    kind: "model",
    wearer: "girl",
    prompt: "photorealistic cheerful Indian girl about 8 years old wearing the jewellery, fully clothed in a colourful traditional silk lehenga or pattu pavadai, festive family celebration at home, soft natural light, natural happy expression, wholesome family-friendly kids jewellery catalog photograph",
  },
];

/** Styles that make sense for a piece, e.g. no maang tikka on a male model, no nose pin on a child. */
export function stylesFor(piece: PieceType): StylePreset[] {
  return STYLES.filter((s) => !s.wearer || WEARABLE[s.wearer].includes(piece));
}

export function assertStyleFits(piece: PieceType, style: StylePreset) {
  if (style.wearer && !WEARABLE[style.wearer].includes(piece)) {
    throw new Error(`"${style.label}" cannot show a ${piece}. Options for a ${piece}: ${stylesFor(piece).map((s) => s.id).join(", ")}`);
  }
}

export function getStyle(id: string): StylePreset {
  const style = STYLES.find((s) => s.id === id);
  if (!style) throw new Error(`Unknown style "${id}". Options: ${STYLES.map((s) => s.id).join(", ")}`);
  return style;
}

/**
 * Where the jewellery sits on the canvas, as fractions of canvas size.
 * For model shots this decides which body area the model is generated around.
 */
export interface Placement {
  /** Max width/height of the piece relative to the canvas. */
  maxW: number;
  maxH: number;
  /** Centre of the piece. */
  cx: number;
  cy: number;
  /** Extra prompt hint describing the pose around the piece. */
  poseHint: string;
}

export function placementFor(piece: PieceType, kind: ShotKind): Placement {
  if (kind === "product") return { maxW: 0.62, maxH: 0.62, cx: 0.5, cy: 0.52, poseHint: "" };
  switch (piece) {
    case "necklace":
    case "pendant":
      return { maxW: 0.5, maxH: 0.4, cx: 0.5, cy: 0.55, poseHint: "front view, head and shoulders crop, necklace worn on the neck and collarbone" };
    case "necklace-set":
      return { maxW: 0.5, maxH: 0.4, cx: 0.5, cy: 0.55, poseHint: "front view, head and shoulders crop, hair tucked behind both ears, necklace worn on the neck and a matching earring on each ear" };
    case "chain":
      return { maxW: 0.42, maxH: 0.4, cx: 0.5, cy: 0.55, poseHint: "front view, neck and upper chest crop, chain worn around the neck resting on the collarbone" };
    case "payal":
      return { maxW: 0.5, maxH: 0.22, cx: 0.5, cy: 0.6, poseHint: "close-up of feet and ankles, anklet worn around the ankle" };
    case "earring":
      return { maxW: 0.16, maxH: 0.3, cx: 0.58, cy: 0.5, poseHint: "close-up side profile of face, earring hanging from the earlobe" };
    case "maang-tikka":
      return { maxW: 0.18, maxH: 0.3, cx: 0.5, cy: 0.3, poseHint: "close-up of face, tikka worn on the forehead at the hair parting" };
    case "nose-pin":
      return { maxW: 0.08, maxH: 0.08, cx: 0.53, cy: 0.5, poseHint: "close-up of face, nose pin worn on the nostril" };
    case "ring":
      return { maxW: 0.22, maxH: 0.22, cx: 0.5, cy: 0.5, poseHint: "close-up of an elegant hand, ring worn on the finger" };
    case "bangle":
    case "kada":
    case "bracelet":
      return { maxW: 0.45, maxH: 0.3, cx: 0.5, cy: 0.52, poseHint: "close-up of wrist and hand, worn on the wrist" };
  }
}
