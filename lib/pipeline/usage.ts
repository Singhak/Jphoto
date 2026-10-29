/** Counts paid API calls so every run can show what it spent. */
export type PaidCall = "fal-fill" | "fal-cutout" | "gemini-image" | "gemini-check";

/** fal FLUX Fill: $0.05 per megapixel, rounded up (fal.ai model page, Oct 2026). */
export const FAL_FILL_USD_PER_MP = 0.05;

const counts: Record<PaidCall, number> = { "fal-fill": 0, "fal-cutout": 0, "gemini-image": 0, "gemini-check": 0 };
let falFillUsd = 0;

export function recordCall(kind: PaidCall, megapixels?: number) {
  counts[kind]++;
  if (kind === "fal-fill" && megapixels) falFillUsd += Math.ceil(megapixels) * FAL_FILL_USD_PER_MP;
}

export function usageSummary() {
  return { ...counts, falFillUsd };
}
