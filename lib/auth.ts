import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "menumitra-default-fallback-secret-key-32chars";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export const AUTH_COOKIE_NAME = "menumitra_token";

export interface SessionPayload {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "OWNER" | "STAFF";
  restaurantId?: string | null;
  impersonatedBy?: string | null; // Super Admin email who is impersonating
  originalAdminId?: string | null; // Super Admin ID to revert back
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const WAITER_COOKIE_NAME = "menumitra_waiter_token";

export async function createWaiterToken(payload: {
  restaurantId: string;
  restaurantSlug: string;
  pin: string;
}): Promise<string> {
  return new SignJWT({ ...payload, role: "WAITER" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secretKey);
}

export async function verifyWaiterToken(token: string): Promise<{
  role: "WAITER";
  restaurantId: string;
  restaurantSlug: string;
  pin: string;
} | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (payload.role !== "WAITER") return null;
    return payload as unknown as {
      role: "WAITER";
      restaurantId: string;
      restaurantSlug: string;
      pin: string;
    };
  } catch {
    return null;
  }
}
