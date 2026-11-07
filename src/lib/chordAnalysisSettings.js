// 작업실 코드 분석 카드 켜기·끄기 설정(muselog-chord-analysis). 첫 화면이 분석 코드를 함께 받지 않도록 따로 둔다

// 없거나 깨지면 켜짐
export function normalizeChordAnalysis(value) {
  return { on: !(value && typeof value === "object" && value.on === false) };
}
