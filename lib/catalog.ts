import type { PieceType } from "./pipeline/presets";

/** Piece names as jewellers say them. Order here is the order in the piece picker. */
export const PIECES: { id: PieceType; label: string; hint: string; tip: string }[] = [
  { id: "necklace", label: "Necklace", hint: "Haar, rani haar, choker", tip: "Best photo: laid flat from straight above, the whole chain in the frame." },
  { id: "necklace-set", label: "Necklace Set", hint: "Necklace with matching earrings", tip: "Best photo: necklace and both earrings laid flat, from straight above." },
  { id: "earring", label: "Earrings", hint: "Jhumka, studs, drops", tip: "Best photo: the pair side by side, from the front, both in one photo." },
  { id: "ring", label: "Ring", hint: "Finger ring, solitaire", tip: "Best photo: ring standing upright, shot from the front so the top design faces the camera." },
  { id: "bangle", label: "Bangles", hint: "One or a stack", tip: "Best photo: standing on its edge or lying flat, the full circle in the frame." },
  { id: "pendant", label: "Pendant", hint: "With or without chain", tip: "Best photo: laid flat from straight above, front side up." },
  { id: "chain", label: "Chain", hint: "Gold or silver chain", tip: "Best photo: laid in a loose loop, no twists, from straight above." },
  { id: "bracelet", label: "Bracelet", hint: "Wrist jewellery", tip: "Best photo: laid flat in a gentle curve, clasp closed." },
  { id: "kada", label: "Kada", hint: "Solid cuff", tip: "Best photo: standing on its edge, the front design facing the camera." },
  { id: "maang-tikka", label: "Maang Tikka", hint: "Forehead jewellery", tip: "Best photo: laid flat and straight, chain and pendant both in the frame." },
  { id: "nose-pin", label: "Nose Pin", hint: "Nath, stud", tip: "Best photo: close up from the front, on a plain surface." },
  { id: "payal", label: "Payal", hint: "Anklets", tip: "Best photo: laid flat in a gentle curve, from straight above." },
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

/** Price per photo drops as the top-up grows. Prices include all taxes. */
export const TOP_UPS = [
  { photos: 10, perPhoto: 40 },
  { photos: 25, perPhoto: 35 },
  { photos: 50, perPhoto: 30 },
  { photos: 100, perPhoto: 25 },
];

export const topUpPrice = (photos: number) => {
  const pack = TOP_UPS.find((t) => t.photos === photos);
  return pack ? pack.photos * pack.perPhoto : null;
};

/** Indian mobile number as 10 digits, or null. Cashfree needs one for every order. */
export function mobileDigits(phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/**
 * Model looks (bride, groom and so on) stay hidden until exact mode is built: today the AI places the piece,
 * so those shots fail the fidelity check more often. Set NEXT_PUBLIC_MODEL_LOOKS=1 to show them.
 */
export const MODEL_LOOKS_ON = process.env.NEXT_PUBLIC_MODEL_LOOKS === "1";

/** Free downloads every new account starts with. */
export const WELCOME_CREDITS = 3;
