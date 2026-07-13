// 위도 1도 ≈ 111km이므로 0.0009도 ≈ 100m. 시터 활동지역 좌표를 저장할 때
// 실제 주소가 그대로 노출되지 않도록 무작위 오차를 더한다(거리 계산에는 영향 미미).
const FUZZ_RADIUS_DEG = 0.0009;

export function fuzzCoordinate(value: number): number {
  const offset = (Math.random() - 0.5) * 2 * FUZZ_RADIUS_DEG;
  return value + offset;
}
