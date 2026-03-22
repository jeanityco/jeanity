import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js middleware entry (this project uses `src/proxy.ts` as configured by the framework).
 * Public URLs like /@handle → internal /u/handle
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (/^\/@[^/]+$/.test(pathname)) {
    const handle = pathname.replace(/^\/@/, "");
    if (!handle) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = `/u/${encodeURIComponent(handle)}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
