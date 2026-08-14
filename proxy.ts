import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";

export const proxy = auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginPage = pathname === "/admin/login";
  const isIcalExport = pathname === "/api/calendar";
  const isAuthenticated = !!req.auth;

  // Protect iCal export — return 401 rather than redirect (it's an API endpoint)
  if (isIcalExport && !isAuthenticated) {
    return new NextResponse("Unauthorised", { status: 401 });
  }

  if (isAdminRoute && !isLoginPage && !isAuthenticated) {
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
  matcher: ["/admin/:path*", "/api/calendar"],
};
