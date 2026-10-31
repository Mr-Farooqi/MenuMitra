import { prisma } from "./prisma";

export interface PaymentIntentResult {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  status: "PAID" | "FAILED";
  message: string;
}

/**
 * Mock payment gateway for subscription upgrades/downgrades.
 * Simulates real payment processing (e.g. Razorpay / Stripe) and creates Invoice records.
 */
export async function processMockSubscriptionPayment(params: {
  restaurantId: string;
  targetPackageId: string;
  paymentMethod?: string;
  finalAmount?: number;
  promoCode?: string;
}): Promise<PaymentIntentResult> {
  const { restaurantId, targetPackageId, finalAmount, promoCode } = params;

  const [restaurant, targetPackage] = await Promise.all([
    prisma.restaurant.findUnique({ where: { id: restaurantId }, include: { package: true } }),
    prisma.package.findUnique({ where: { id: targetPackageId } }),
  ]);

  if (!restaurant) {
    throw new Error("Restaurant not found");
  }

  if (!targetPackage) {
    throw new Error("Target package not found");
  }

  // Simulate payment gateway delay and transaction id
  const transactionId = `PAY_MOCK_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const billedAmount = finalAmount !== undefined ? finalAmount : targetPackage.price;

  // Create invoice record
  await prisma.invoice.create({
    data: {
      restaurantId,
      packageId: targetPackage.id,
      amount: billedAmount,
      status: "PAID",
      paymentId: promoCode ? `${transactionId} (PROMO: ${promoCode})` : transactionId,
    },
  });

  // Upgrade / update restaurant package
  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: { packageId: targetPackage.id },
  });

  return {
    success: true,
    transactionId,
    amount: targetPackage.price,
    currency: "INR",
    status: "PAID",
    message: `Plan updated successfully to ${targetPackage.name}`,
  };
}
