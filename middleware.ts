import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only guard admin routes
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Let client-side guard handle auth
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
