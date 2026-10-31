export interface WeightedRewardItem {
  id: string;
  weight: number;
  active: boolean;
  [key: string]: unknown;
}

/**
 * Weighted random selector.
 * Guarantees fair selection according to weights defined in RewardRules.
 */
export function selectWeightedReward<T extends WeightedRewardItem>(rules: T[]): T | null {
  const activeRules = rules.filter((r) => r.active && r.weight > 0);
  if (activeRules.length === 0) return null;

  const totalWeight = activeRules.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return activeRules[0];

  let random = Math.random() * totalWeight;

  for (const rule of activeRules) {
    if (random < rule.weight) {
      return rule;
    }
    random -= rule.weight;
  }

  return activeRules[activeRules.length - 1];
}

/**
 * Generates a memorable, unique coupon code.
 * Example format: MITRA-8A4F or TREAT-99X
 */
export function generateCouponCode(prefix = "MITRA"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars like 0/O, 1/I
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}
