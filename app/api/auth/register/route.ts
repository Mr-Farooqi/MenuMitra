import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth";

const registerSchema = z.object({
  // Owner info
  name: z.string().min(2, "Owner name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  // Restaurant info
  restaurantName: z.string().min(2, "Restaurant name is required"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  packageId: z.string().min(1, "Package selection is required"),
  phone: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  timings: z.string().optional(),
  googleReviewLink: z.string().optional(),
  logo: z.string().optional(),
  cover: z.string().optional(),
  firstCategoryName: z.string().optional(),
  utrReference: z.string().optional(),
  promoCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const data = result.data;

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists", code: "EMAIL_TAKEN" },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { slug: data.slug.toLowerCase() },
    });
    if (existingRestaurant) {
      return NextResponse.json(
        { error: "This restaurant URL slug is already taken. Try another.", code: "SLUG_TAKEN" },
        { status: 400 }
      );
    }

    // Verify package exists
    const pkg = await prisma.package.findUnique({
      where: { id: data.packageId },
    });
    if (!pkg) {
      return NextResponse.json({ error: "Invalid package selected", code: "INVALID_PACKAGE" }, { status: 400 });
    }

    let finalAmount = pkg.price;
    let discountAmount = 0;
    let appliedPromo: string | null = null;

    if (data.promoCode) {
      const cleanCode = data.promoCode.trim().toUpperCase();
      const promo = await prisma.promoCode.findUnique({ where: { code: cleanCode } });
      if (
        promo &&
        promo.active &&
        (!promo.expiresAt || promo.expiresAt > new Date()) &&
        promo.usedCount < promo.maxUses
      ) {
        if (promo.discountPercent) {
          discountAmount = Math.round(((pkg.price * promo.discountPercent) / 100) * 100) / 100;
        } else if (promo.discountAmount) {
          discountAmount = Math.min(promo.discountAmount, pkg.price);
        }
        finalAmount = Math.max(0, pkg.price - discountAmount);
        appliedPromo = promo.code;

        await prisma.promoCode.update({
          where: { id: promo.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    const passwordHash = await hashPassword(data.password);

    // Create Restaurant and Owner in transaction
    const newRestaurant = await prisma.$transaction(async (tx) => {
      const rest = await tx.restaurant.create({
        data: {
          name: data.restaurantName,
          slug: data.slug.toLowerCase(),
          packageId: pkg.id,
          phone: data.phone || "",
          city: data.city || "",
          address: data.address || "",
          timings: data.timings || "11:00 AM - 11:00 PM",
          googleReviewLink: data.googleReviewLink || "",
          logo: data.logo || null,
          cover: data.cover || null,
          status: "PENDING_PAYMENT", // Pending admin verification of UPI payment
        },
      });

      // Create owner user
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email.toLowerCase(),
          passwordHash,
          role: "OWNER",
          restaurantId: rest.id,
        },
      });

      // Create default review settings
      await tx.reviewSettings.create({
        data: {
          restaurantId: rest.id,
          popupEnabled: true,
          popupDelaySeconds: 6,
          autoApprove: true,
          cooldownDays: 30,
          minBill: 0,
          googleReviewLink: data.googleReviewLink || "",
        },
      });

      // Create default website config
      await tx.websiteConfig.create({
        data: {
          restaurantId: rest.id,
          template: "MODERN",
          published: true,
          sections: JSON.stringify({
            hero: {
              headline: `Welcome to ${rest.name}`,
              subheadline: "Delicious food prepared with the freshest ingredients and passion.",
              ctaText: "View Menu",
              badge: "Fresh & Tasty",
            },
            about: {
              title: "Our Story",
              story: `At ${rest.name}, we believe in creating memorable dining experiences with rich flavours and warm hospitality.`,
              signatureDish: "Chef's Special Recommendation",
            },
            hours: {
              weekday: data.timings || "11:00 AM – 11:00 PM",
              weekend: data.timings || "11:00 AM – 11:30 PM",
              note: "Dine-in and Takeaway available",
            },
            contact: {
              phone: data.phone || "",
              email: data.email || "",
              address: `${data.address || ""}, ${data.city || ""}`,
            },
            gallery: [],
          }),
        },
      });

      // Default tables 1..4
      for (let t = 1; t <= 4; t++) {
        await tx.table.create({
          data: {
            restaurantId: rest.id,
            number: t,
          },
        });
      }

      // Default first menu category
      const firstCat = await tx.menuCategory.create({
        data: {
          restaurantId: rest.id,
          name: data.firstCategoryName || "Chef's Specials",
          order: 0,
        },
      });

      // Default starter item
      await tx.menuItem.create({
        data: {
          restaurantId: rest.id,
          categoryId: firstCat.id,
          name: "Crispy Paneer Bites",
          description: "Golden spiced cottage cheese tossed with aromatic herbs",
          price: 220,
          isVeg: true,
          isAvailable: true,
          tags: JSON.stringify(["Bestseller"]),
          order: 0,
        },
      });

      // Default reward rule for review rewards
      await tx.rewardRule.create({
        data: {
          restaurantId: rest.id,
          label: "15% Off on Next Visit",
          type: "PERCENT",
          value: 15,
          weight: 50,
          expiryDays: 30,
          usageLimit: 1,
          active: true,
        },
      });

      // Record initial subscription payment request
      await tx.subscriptionPayment.create({
        data: {
          restaurantId: rest.id,
          packageId: pkg.id,
          amount: finalAmount,
          originalAmount: pkg.price,
          discountAmount,
          promoCode: appliedPromo,
          paymentMethod: "UPI_QR",
          utrReference: data.utrReference?.trim() || null,
          payerPhone: data.phone || null,
          payerName: data.name,
          status: "PENDING",
        },
      });

      // Audit log entry
      await tx.auditLog.create({
        data: {
          action: "RESTAURANT_REGISTERED",
          details: `Registered restaurant "${rest.name}" with plan "${pkg.name}". Payment status: PENDING (UTR: ${data.utrReference || "N/A"})`,
          actorEmail: data.email.toLowerCase(),
          restaurantId: rest.id,
        },
      });

      return { rest, user };
    });

    // Create session token for immediate login
    const token = await createSessionToken({
      id: newRestaurant.user.id,
      email: newRestaurant.user.email,
      name: newRestaurant.user.name,
      role: "OWNER",
      restaurantId: newRestaurant.rest.id,
    });

    const response = NextResponse.json({
      success: true,
      restaurant: newRestaurant.rest,
      redirectTo: "/dashboard",
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_APP_URL?.startsWith("https"),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to register restaurant. Please check your inputs.", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
