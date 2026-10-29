import { afterEach, describe, expect, it } from "vitest";
import { LIMITS, takeUse } from "@/lib/limits";
import { makeJeweller } from "./helpers";

const defaults = { ...LIMITS };
afterEach(() => Object.assign(LIMITS, defaults));

describe("takeUse", () => {
  it("lets exactly the daily cap through when requests arrive together", async () => {
    LIMITS.zipsPerDay = 3;
    const userId = await makeJeweller();

    const results = await Promise.all(Array.from({ length: 10 }, () => takeUse(userId, "zip")));

    expect(results.filter((r) => r === null)).toHaveLength(3);
    expect(results.find((r) => r !== null)).toMatch(/daily limit/);
  });

  it("counts each kind and each jeweller separately", async () => {
    LIMITS.pdfsPerDay = 1;
    LIMITS.ordersPerDay = 1;
    const a = await makeJeweller();
    const b = await makeJeweller();

    expect(await takeUse(a, "pdf")).toBeNull();
    expect(await takeUse(a, "order")).toBeNull();
    expect(await takeUse(b, "pdf")).toBeNull();
    expect(await takeUse(a, "pdf")).not.toBeNull();
  });

  it("caps tries of one look on one piece, but not other looks", async () => {
    LIMITS.triesPerLook = 2;
    const userId = await makeJeweller();

    expect(await takeUse(userId, "preview", "cut1:marble")).toBeNull();
    expect(await takeUse(userId, "preview", "cut1:marble")).toBeNull();
    expect(await takeUse(userId, "preview", "cut1:marble")).toMatch(/tried 2 times/);
    expect(await takeUse(userId, "preview", "cut1:velvet-maroon")).toBeNull();
  });
});
