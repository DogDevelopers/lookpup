import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: existing } = await supabase
          .from("users")
          .select("is_verified, deleted_at")
          .eq("id", user.id)
          .maybeSingle();

        if (existing?.deleted_at) {
          return NextResponse.redirect(`${origin}/auth/restore`);
        }

        if (existing?.is_verified) {
          return NextResponse.redirect(`${origin}${next}`);
        }

        if (!existing) {
          const provider =
            typeof user.app_metadata.provider === "string"
              ? user.app_metadata.provider
              : "unknown";

          const { error: insertError } = await supabase.from("users").insert({
            id: user.id,
            email: user.email ?? null,
            provider,
          });

          if (insertError) {
            console.error("[auth/callback] users insert failed:", insertError);
          }
        }

        return NextResponse.redirect(
          `${origin}/auth/verification?next=${encodeURIComponent(next)}`,
        );
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=oauth`);
}
