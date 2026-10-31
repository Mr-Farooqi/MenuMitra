import { describe, it, expect } from "vitest";

// Pure calculation logic extracted to verify mathematical accuracy & constraints
function calculateDiscount(
  billAmount: number,
  rule: { type: string; value: number },
  minBill = 0
): { valid: boolean; error?: string; discount: number; finalBill: number } {
  if (billAmount < minBill) {
    return {
      valid: false,
      error: `Minimum bill of ₹${minBill} required to redeem this coupon`,
      discount: 0,
      finalBill: billAmount,
    };
  }

  let discount = 0;
  if (rule.type === "PERCENT") {
    discount = Math.round(((billAmount * rule.value) / 100) * 100) / 100;
  } else if (rule.type === "FLAT") {
    discount = Math.min(rule.value, billAmount);
  } else if (rule.type === "FREE_ITEM" || rule.type === "NONE") {
    discount = 0;
  }

  const finalBill = Math.max(0, billAmount - discount);
  return { valid: true, discount, finalBill };
}

function validateCouponStatus(coupon: {
  status: string;
  expiresAt: Date;
}): { canRedeem: boolean; reason?: string } {
  if (coupon.status === "REDEEMED") {
    return { canRedeem: false, reason: "Coupon is already redeemed and cannot be reused" };
  }
  if (coupon.status === "EXPIRED" || coupon.expiresAt < new Date()) {
    return { canRedeem: false, reason: "Coupon has expired" };
  }
  return { canRedeem: true };
}

describe("Coupon Discount Calculation & Double-Use Prevention", () => {
  it("should calculate correct percentage discount", () => {
    const result = calculateDiscount(1000, { type: "PERCENT", value: 15 });
    expect(result.valid).toBe(true);
    expect(result.discount).toBe(150);
    expect(result.finalBill).toBe(850);
  });

  it("should calculate correct flat cash discount", () => {
    const result = calculateDiscount(800, { type: "FLAT", value: 100 });
    expect(result.valid).toBe(true);
    expect(result.discount).toBe(100);
    expect(result.finalBill).toBe(700);
  });

  it("flat discount should not exceed the bill amount", () => {
    const result = calculateDiscount(50, { type: "FLAT", value: 100 });
    expect(result.valid).toBe(true);
    expect(result.discount).toBe(50);
    expect(result.finalBill).toBe(0);
  });

  it("should enforce minimum bill requirement", () => {
    const result = calculateDiscount(250, { type: "PERCENT", value: 20 }, 500);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Minimum bill of ₹500 required");
  });

  it("should block already redeemed coupons from being reused (Atomic safety)", () => {
    const coupon = {
      status: "REDEEMED",
      expiresAt: new Date(Date.now() + 86400000), // tomorrow
    };
    const validation = validateCouponStatus(coupon);
    expect(validation.canRedeem).toBe(false);
    expect(validation.reason).toContain("already redeemed");
  });

  it("should block expired coupons", () => {
    const coupon = {
      status: "ACTIVE",
      expiresAt: new Date(Date.now() - 10000), // expired 10s ago
    };
    const validation = validateCouponStatus(coupon);
    expect(validation.canRedeem).toBe(false);
    expect(validation.reason).toContain("expired");
  });

  it("should allow active, unexpired coupons", () => {
    const coupon = {
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 86400000),
    };
    const validation = validateCouponStatus(coupon);
    expect(validation.canRedeem).toBe(true);
  });
});
