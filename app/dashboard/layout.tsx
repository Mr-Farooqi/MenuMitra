import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseFeatures } from "@/lib/feature-gate";
import { DashboardShell } from "./shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      restaurant: {
        include: {
          package: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const features = user.restaurant ? parseFeatures(user.restaurant.package.features) : [];

  let latestPendingPayment = null;
  if (user.restaurant) {
    latestPendingPayment = await prisma.subscriptionPayment.findFirst({
      where: {
        restaurantId: user.restaurant.id,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
      include: { package: true },
    });
  }

  const formattedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    impersonatedBy: session.impersonatedBy || null,
    restaurant: user.restaurant
      ? {
          id: user.restaurant.id,
          name: user.restaurant.name,
          slug: user.restaurant.slug,
          logo: user.restaurant.logo,
          status: user.restaurant.status,
          package: {
            name: user.restaurant.package.name,
            slug: user.restaurant.package.slug,
          },
          features: user.restaurant.status === "PENDING_PAYMENT" ? [] : features,
          pendingPayment: latestPendingPayment
            ? {
                id: latestPendingPayment.id,
                amount: latestPendingPayment.amount,
                utrReference: latestPendingPayment.utrReference,
                packageName: latestPendingPayment.package.name,
                createdAt: latestPendingPayment.createdAt.toISOString(),
              }
            : null,
        }
      : null,
  };

  return <DashboardShell user={formattedUser}>{children}</DashboardShell>;
}
