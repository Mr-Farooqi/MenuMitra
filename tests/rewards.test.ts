import { describe, it, expect } from "vitest";
import { selectWeightedReward, generateCouponCode } from "@/lib/rewards";

describe("Weighted Random Reward Selection & Coupon Generation", () => {
  it("should generate properly formatted unique coupon code", () => {
    const code = generateCouponCode("MITRA");
    expect(code).toMatch(/^MITRA-[A-Z0-9]{5}$/);
    const suffix = code.split("-")[1];
    // Suffix should not contain ambiguous characters like 0, O, 1, I
    expect(suffix).not.toMatch(/[0O1I]/);
  });

  it("should return null if all rules are inactive", () => {
    const rules = [
      { id: "1", weight: 50, active: false },
      { id: "2", weight: 50, active: false },
    ];
    const picked = selectWeightedReward(rules);
    expect(picked).toBeNull();
  });

  it("should select the only active rule available", () => {
    const rules = [
      { id: "1", weight: 10, active: false },
      { id: "2", weight: 100, active: true },
    ];
    const picked = selectWeightedReward(rules);
    expect(picked?.id).toBe("2");
  });

  it("distribution over 1,000 runs roughly follows configured weights", () => {
    const rules = [
      { id: "heavy", weight: 80, active: true },
      { id: "light", weight: 20, active: true },
    ];

    let heavyCount = 0;
    const runs = 1000;

    for (let i = 0; i < runs; i++) {
      const picked = selectWeightedReward(rules);
      if (picked?.id === "heavy") heavyCount++;
    }

    const heavyPercentage = (heavyCount / runs) * 100;
    // Expected around 80%, allow realistic statistical variance (72% - 88%)
    expect(heavyPercentage).toBeGreaterThanOrEqual(72);
    expect(heavyPercentage).toBeLessThanOrEqual(88);
  });
});
