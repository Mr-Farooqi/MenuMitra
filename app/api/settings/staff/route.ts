import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const dynamic = "force-dynamic";

const staffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function GET() {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staff = await prisma.user.findMany({
    where: {
      restaurantId: session.restaurantId,
      role: { in: ["STAFF", "OWNER"] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ staff });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.restaurantId || session.role !== "OWNER") {
    return NextResponse.json({ error: "Only owners can add staff members" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = staffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { name, email, password } = parsed.data;

    // Check email uniqueness
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newStaff = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash: hashedPassword,
        role: "STAFF",
        restaurantId: session.restaurantId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, staff: newStaff });
  } catch (error) {
    console.error("Create staff error:", error);
    return NextResponse.json({ error: "Failed to create staff member" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.restaurantId || session.role !== "OWNER") {
    return NextResponse.json({ error: "Only owners can remove staff members" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Staff ID required" }, { status: 400 });

    // Prevent deleting oneself
    if (id === session.id) {
      return NextResponse.json({ error: "You cannot delete your own owner account" }, { status: 400 });
    }

    const targetUser = await prisma.user.findFirst({
      where: { id, restaurantId: session.restaurantId, role: "STAFF" },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Staff member removed" });
  } catch (error) {
    console.error("Delete staff error:", error);
    return NextResponse.json({ error: "Failed to delete staff member" }, { status: 500 });
  }
}
