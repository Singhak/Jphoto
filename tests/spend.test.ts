import { describe, expect, it } from "vitest";
import { recordCall, type Spend, withSpend } from "@/lib/pipeline/usage";

describe("withSpend", () => {
  it("keeps the calls of two requests running at once apart", async () => {
    const seen: Spend[] = [];
    const work = (fills: number) => async () => {
      for (let i = 0; i < fills; i++) {
        await new Promise((r) => setTimeout(r, 1));
        recordCall("fal-fill", 0.93);
        recordCall("gemini-check");
      }
    };

    await Promise.all([withSpend(work(1), (s) => seen.push(s)), withSpend(work(3), (s) => seen.push(s))]);

    const byFills = seen.sort((a, b) => a.calls["fal-fill"] - b.calls["fal-fill"]);
    expect(byFills[0].calls).toMatchObject({ "fal-fill": 1, "gemini-check": 1 });
    expect(byFills[0].falFillUsd).toBeCloseTo(0.05);
    expect(byFills[1].calls).toMatchObject({ "fal-fill": 3, "gemini-check": 3 });
    expect(byFills[1].falFillUsd).toBeCloseTo(0.15);
  });

  it("still reports what was spent when the work fails", async () => {
    let spent: Spend | undefined;
    const failing = withSpend(
      async () => {
        recordCall("gemini-image");
        throw new Error("judge rejected it");
      },
      (s) => (spent = s),
    );

    await expect(failing).rejects.toThrow("judge rejected it");
    expect(spent?.calls["gemini-image"]).toBe(1);
  });
});
