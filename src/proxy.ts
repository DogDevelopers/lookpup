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

  // 이 라우트의 리다이렉트 여부는 로그인 상태에 좌우되지 않으므로, Supabase 왕복(auth
  // getUser) 자체를 건너뛴다 — 대부분의 public 페이지가 여기 해당해 TTFB가 개선된다.
  if (!isLoginGet && !isProtected(pathname)) {
    return NextResponse.next({ request });
  }

  const { supabaseResponse, user } = await updateSession(request);

  // GET(페이지 이동)만 리다이렉트한다 — 로그인 버튼이 호출하는 Server Action은
  // 같은 경로로 POST 요청을 보내는데, 여기서 가로채면 액션이 실행되지 못한다.
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
