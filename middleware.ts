import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Sends signed-out visitors to /login. This only checks that a session cookie exists;
 * each API route still checks the session itself before touching any data.
 */
export function middleware(req: NextRequest) {
  if (getSessionCookie(req)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/studio/:path*", "/collections/:path*", "/wallet/:path*", "/settings/:path*", "/brochure/:path*"],
};
