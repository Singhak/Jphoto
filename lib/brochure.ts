import { z } from "zod";

/**
 * Shop brochures: a free extra once a jeweller has downloaded enough photos.
 * Shared by the server (lib/account.ts checks the rules) and the brochure page, so nothing here touches the database.
 */

/** Downloaded (paid) photos needed before brochures unlock. Free previews don't count. */
export const BROCHURE_UNLOCK = 15;

export const PURITIES = ["24K", "22K", "18K", "14K", "Silver", "Platinum"] as const;

export const BrochureItem = z.object({
  creationId: z.string(),
  name: z.string().trim().max(60),
  code: z.string().trim().max(30),
  purity: z.enum(PURITIES).or(z.literal("")),
  /** Grams, as typed: "42.6". Printed as "approx. 42.6 g". */
  weight: z.string().trim().max(12),
  /** Gets a page of its own with this line under it. */
  featured: z.boolean(),
  note: z.string().trim().max(240),
});
export type BrochureItem = z.infer<typeof BrochureItem>;

export const Brochure = z.object({
  collection: z.string().min(1).max(120),
  template: z.enum(["bridal", "daily", "festive"]),
  title: z.string().trim().max(60),
  subtitle: z.string().trim().max(90),
  items: z.array(BrochureItem).max(120),
});
export type Brochure = z.infer<typeof Brochure>;
export type TemplateId = Brochure["template"];

interface Palette {
  bg: string;
  ink: string;
  accent: string;
  muted: string;
  line: string;
  /** Behind photos while they load, and around a photo that doesn't fill its box. */
  photo: string;
}

/** Cover and back cover use `cover`; the inside pages use `inside`. Every text colour passes 4.5:1 on its ground. */
export const TEMPLATES: Record<TemplateId, { label: string; blurb: string; cover: Palette; inside: Palette }> = {
  bridal: {
    label: "Bridal",
    blurb: "Black and champagne gold",
    cover: { bg: "#15130F", ink: "#F3EEE4", accent: "#D9C08A", muted: "#BDB3A1", line: "#3A342B", photo: "#24211C" },
    inside: { bg: "#FAFAF8", ink: "#1C1A17", accent: "#8A6A2A", muted: "#5E574C", line: "#E2DED5", photo: "#EFEDE8" },
  },
  daily: {
    label: "Daily wear",
    blurb: "Light, clean and simple",
    cover: { bg: "#F4F2EE", ink: "#1C1A17", accent: "#7A5C1E", muted: "#5E574C", line: "#DCD6CB", photo: "#E8E4DD" },
    inside: { bg: "#FFFFFF", ink: "#1C1A17", accent: "#7A5C1E", muted: "#5E574C", line: "#E6E2DA", photo: "#F2F0EC" },
  },
  festive: {
    label: "Festive",
    blurb: "Deep emerald and gold",
    cover: { bg: "#0F2A24", ink: "#F1EDE2", accent: "#E2C27A", muted: "#B9C4BC", line: "#2C4A42", photo: "#1A3A33" },
    inside: { bg: "#FBFAF6", ink: "#1A211E", accent: "#7A5C1E", muted: "#53605A", line: "#E0DDD3", photo: "#EEEDE6" },
  },
};

/** Photos per inside grid page: 3 across, 2 down, at the photos' own 4:5 shape so nothing is cropped. */
export const PER_GRID_PAGE = 6;

/** "22K · approx. 42.6 g", skipping whatever is blank. */
export const specLine = (item: Pick<BrochureItem, "purity" | "weight">) =>
  [item.purity, item.weight && `approx. ${item.weight.replace(/\s*g$/i, "")} g`].filter(Boolean).join(" · ");
