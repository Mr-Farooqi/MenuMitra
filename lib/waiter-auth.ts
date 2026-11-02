import { NextRequest } from "next/server";
import { getSessionFromRequest, verifyWaiterToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getWaiterOrOwnerSession(req: NextRequest) {
  // 1. Check Owner/Staff Dashboard session first
  const ownerSession = await getSessionFromRequest(req);
  if (ownerSession && ownerSession.restaurantId) {
    return {
      type: "OWNER" as const,
      restaurantId: ownerSession.restaurantId,
    };
  }

  // 2. Check Waiter Token (from Authorization header or cookie)
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;
  const cookieToken = req.cookies.get("menumitra_waiter_token")?.value;
  const token = bearerToken || cookieToken;

  if (token) {
    const waiterPayload = await verifyWaiterToken(token);
    if (waiterPayload) {
      // Validate that PIN is still currently active
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: waiterPayload.restaurantId },
        select: { id: true, waiterPin: true, slug: true },
      });
      if (restaurant && (!restaurant.waiterPin || restaurant.waiterPin === waiterPayload.pin)) {
        return {
          type: "WAITER" as const,
          restaurantId: restaurant.id,
          restaurantSlug: restaurant.slug,
        };
      }
    }
  }

  return null;
}
