import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = [
  "/chat",
  "/notifications",
  "/pet-register",
  "/sitter-register",
  "/admin",
];

function isProtected(pathname: string): boolean {
  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  if (pathname.startsWith("/petsitters")) return pathname.includes("/book");
  if (pathname.startsWith("/board")) {
    return pathname.startsWith("/board/write") || pathname.endsWith("/edit");
  }
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginGet = request.method === "GET" && pathname.startsWith("/auth/login");

  if (!isLoginGet && !isProtected(pathname)) {
    return NextResponse.next({ request });
  }

  const { supabaseResponse, user } = await updateSession(request);

  if (user && isLoginGet) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!user && isProtected(pathname)) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
