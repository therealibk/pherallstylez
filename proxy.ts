import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";

export const proxy = auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl;

  const isLoginPage = pathname === "/admin/login";
  const isAuthenticated = !!req.auth;

  if (!isLoginPage && !isAuthenticated) {
    const loginUrl = new URL("/admin/login", req.url);
    // Only allow relative paths — prevents open redirect via crafted callbackUrl
    if (pathname.startsWith("/admin/") && !pathname.includes("//")) {
      loginUrl.searchParams.set("callbackUrl", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
