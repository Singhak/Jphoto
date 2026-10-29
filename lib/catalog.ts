import type { PieceType } from "./pipeline/presets";

/** Piece names as jewellers say them. Order here is the order in the piece picker. */
export const PIECES: { id: PieceType; label: string; hint: string }[] = [
  { id: "necklace", label: "Necklace", hint: "Haar, rani haar, choker" },
  { id: "necklace-set", label: "Necklace Set", hint: "Necklace with matching earrings" },
  { id: "earring", label: "Earrings", hint: "Jhumka, studs, drops" },
  { id: "ring", label: "Ring", hint: "Finger ring, solitaire" },
  { id: "bangle", label: "Bangles", hint: "One or a stack" },
  { id: "pendant", label: "Pendant", hint: "With or without chain" },
  { id: "chain", label: "Chain", hint: "Gold or silver chain" },
  { id: "bracelet", label: "Bracelet", hint: "Wrist jewellery" },
  { id: "kada", label: "Kada", hint: "Solid cuff" },
  { id: "maang-tikka", label: "Maang Tikka", hint: "Forehead jewellery" },
  { id: "nose-pin", label: "Nose Pin", hint: "Nath, stud" },
  { id: "payal", label: "Payal", hint: "Anklets" },
];

export const pieceLabel = (id: PieceType) => PIECES.find((p) => p.id === id)?.label ?? id;

/**
 * Look of each style card. These are CSS stand-ins until we have real sample shots per style;
 * swap `swatch` for an image when we do.
 */
export const STYLE_LOOKS: Record<string, { blurb: string; swatch: string; dark?: boolean }> = {
  "studio-white": { blurb: "Pure white, for marketplaces", swatch: "radial-gradient(circle at 50% 60%, #ffffff 0%, #f1efeb 100%)" },
  "studio-cream": { blurb: "Warm cream, soft and clean", swatch: "radial-gradient(circle at 50% 60%, #fbf5ea 0%, #ece0cb 100%)" },
  "velvet-maroon": { blurb: "Rich velvet, classic showroom", swatch: "radial-gradient(circle at 40% 35%, #9b2f3c 0%, #4d0f18 85%)", dark: true },
  marble: { blurb: "White marble, modern and premium", swatch: "linear-gradient(125deg, #f7f6f3 0%, #e4e1db 35%, #f9f8f5 50%, #d9d5ce 70%, #f4f2ee 100%)" },
  "silk-ivory": { blurb: "Draped silk, bridal feel", swatch: "repeating-linear-gradient(110deg, #f6eedf 0 18px, #ebdfc9 18px 30px, #f8f1e4 30px 46px)" },
  festive: { blurb: "Diwali mood, diyas and marigold", swatch: "radial-gradient(circle at 25% 30%, #f4b13d 0 6%, transparent 7%), radial-gradient(circle at 75% 25%, #f08a24 0 5%, transparent 6%), linear-gradient(160deg, #4a2a17 0%, #2b170c 100%)", dark: true },
  "model-bridal": { blurb: "Bride in a red and gold saree", swatch: "linear-gradient(160deg, #b8323d 0%, #7a1f2b 55%, #c9a24f 100%)", dark: true },
  "model-everyday": { blurb: "Everyday wear, clean background", swatch: "linear-gradient(160deg, #e9ddd0 0%, #c8ad94 100%)" },
  "model-groom": { blurb: "Groom in an ivory sherwani", swatch: "linear-gradient(160deg, #f3ead8 0%, #d7bf8c 100%)" },
  "model-men-everyday": { blurb: "Men's casual, black or white shirt", swatch: "linear-gradient(160deg, #3b3836 0%, #151413 100%)", dark: true },
  "model-girl-festive": { blurb: "Kids' festive lehenga", swatch: "linear-gradient(160deg, #f19bb0 0%, #e2a83c 100%)" },
};

/** Price per photo drops as the top-up grows. Placeholder prices; set the real ones before launch. */
export const TOP_UPS = [
  { photos: 10, perPhoto: 59 },
  { photos: 25, perPhoto: 52 },
  { photos: 50, perPhoto: 45 },
  { photos: 100, perPhoto: 38 },
  { photos: 250, perPhoto: 30 },
];

export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** Free downloads every new account starts with. */
export const WELCOME_CREDITS = 3;
