import { prisma } from "./prisma";

export async function logAuditEvent(params: {
  action: string;
  details: string;
  actorEmail: string;
  restaurantId?: string | null;
  ipAddress?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        details: params.details,
        actorEmail: params.actorEmail,
        restaurantId: params.restaurantId || null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (err) {
    console.error("Failed to log audit event:", err);
  }
}
