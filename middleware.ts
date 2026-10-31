import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "menumitra-default-fallback-secret-key-32chars";
const secretKey = new TextEncoder().encode(JWT_SECRET);
const AUTH_COOKIE = "menumitra_token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static files and internal Next.js paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/api/public") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  let user: { id: string; email: string; role: string; restaurantId?: string } | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, secretKey);
      user = payload as unknown as { id: string; email: string; role: string; restaurantId?: string };
    } catch (err) {
      console.error("[MIDDLEWARE JWT VERIFY ERROR]:", err);
      user = null;
    }
  } else {
    console.log("[MIDDLEWARE]: No token found in cookies:", request.cookies.getAll().map(c => c.name));
  }

  // Auth pages: /login and /register
  const isAuthPage = pathname === "/login" || pathname === "/register";
  if (isAuthPage && user) {
    if (user.role === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Protected Super Admin routes
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Protected Owner / Staff Dashboard routes
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
