import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        restaurant: {
          include: {
            package: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    // Generate JWT
    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "SUPER_ADMIN" | "OWNER" | "STAFF",
      restaurantId: user.restaurantId,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        restaurant: user.restaurant
          ? {
              id: user.restaurant.id,
              name: user.restaurant.name,
              slug: user.restaurant.slug,
              package: user.restaurant.package,
            }
          : null,
      },
      redirectTo: user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard",
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_APP_URL?.startsWith("https"),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during login", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
