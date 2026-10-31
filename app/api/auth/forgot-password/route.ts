import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const forgotSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = forgotSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry,
        },
      });

      const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/forgot-password?token=${resetToken}`;
      console.log("==================================================");
      console.log(`[PASSWORD RESET DEV LOG]`);
      console.log(`Email: ${user.email}`);
      console.log(`Reset Token: ${resetToken}`);
      console.log(`Reset Link: ${resetLink}`);
      console.log("==================================================");
    }

    // Always return success so emails are not enumerated
    return NextResponse.json({
      success: true,
      message: "If an account exists with that email, a password reset link has been dispatched.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
