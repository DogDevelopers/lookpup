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
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // GET(페이지 이동)만 리다이렉트한다 — 로그인 버튼이 호출하는 Server Action은
  // 같은 경로로 POST 요청을 보내는데, 여기서 가로채면 액션이 실행되지 못한다.
  if (user && request.method === "GET" && pathname.startsWith("/auth/login")) {
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
