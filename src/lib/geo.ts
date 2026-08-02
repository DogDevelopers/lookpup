const FUZZ_RADIUS_DEG = 0.0009;

export function fuzzCoordinate(value: number): number {
  const offset = (Math.random() - 0.5) * 2 * FUZZ_RADIUS_DEG;
  return value + offset;
}

export async function syncLocationAcrossProfiles(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  userId: string,
  location: { address: string; displayArea: string; lat: number; lng: number },
  source: "users" | "sitters",
) {
  if (source === "users") {
    const { data: sitter } = await supabase
      .from("sitters")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!sitter) return;
    await supabase
      .from("sitters")
      .update({
        available_area: location.address,
        display_area: location.displayArea,
        latitude: fuzzCoordinate(location.lat),
        longitude: fuzzCoordinate(location.lng),
      })
      .eq("id", sitter.id);
    return;
  }

  await supabase
    .from("users")
    .update({
      address: location.address,
      display_area: location.displayArea,
      latitude: fuzzCoordinate(location.lat),
      longitude: fuzzCoordinate(location.lng),
    })
    .eq("id", userId);
}
