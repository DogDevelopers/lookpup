// 위도 1도 ≈ 111km이므로 0.0009도 ≈ 100m. 시터 활동지역 좌표를 저장할 때
// 실제 주소가 그대로 노출되지 않도록 무작위 오차를 더한다(거리 계산에는 영향 미미).
const FUZZ_RADIUS_DEG = 0.0009;

export function fuzzCoordinate(value: number): number {
  const offset = (Math.random() - 0.5) * 2 * FUZZ_RADIUS_DEG;
  return value + offset;
}

// 보호자(users) 위치와 펫시터(sitters) 활동지역은 사용자 입장에서 하나의 위치로 취급한다.
// 한쪽을 수정하면 반대쪽 프로필이 존재할 때 같이 갱신해 두 값이 어긋나지 않도록 한다.
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
