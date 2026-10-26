// 메트로놈 계산 (순수 함수). 소리 재생은 Metronome.jsx에서 한다.

export const MIN_BPM = 10;
export const MAX_BPM = 300;
export const BEAT_OPTIONS = [2, 3, 4, 6];
const MAX_BEATS = Math.max(...BEAT_OPTIONS);
// 리듬: 한 박을 몇 번 나눠 소리 낼지
// symbol이 null인 셋잇단음표는 글자 기호가 없어 Metronome.jsx에서 그림으로 그린다
export const SUBDIVISION_OPTIONS = [
  { value: 1, symbol: "♩", name: "4분음표" },
  { value: 2, symbol: "♫", name: "8분음표" },
  { value: 3, symbol: null, name: "셋잇단음표" },
  { value: 4, symbol: "♬", name: "16분음표" },
];
// accents: 강조할 박 번호 (1부터)
export const DEFAULT_METRONOME = { bpm: 120, beats: 4, accents: [1], subdivision: 1 };

// 탭 템포: 이 시간(ms)보다 오래 쉬면 새로 세고, 최근 4번 간격(탭 5번)까지만 평균
const TAP_RESET_MS = 2000;
const MAX_TAPS = 5;

// 10~300 범위의 정수로 맞춘다. 숫자가 아니면 null
export function clampBpm(value) {
  const n = Number(value);
  if (value === null || value === "" || typeof value === "boolean" || !Number.isFinite(n)) return null;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(n)));
}

// 강조할 박 번호 읽기. 예전 형식 accent(true/false)는 [1] / []로 바꾼다.
// 1~6이 아닌 값과 중복은 버리고 작은 번호부터 정렬한다
function normalizeAccents(saved) {
  if (Array.isArray(saved.accents)) {
    const valid = saved.accents.filter(n => Number.isInteger(n) && n >= 1 && n <= MAX_BEATS);
    return [...new Set(valid)].sort((a, b) => a - b);
  }
  if (typeof saved.accent === "boolean") return saved.accent ? [1] : [];
  return [...DEFAULT_METRONOME.accents];
}

// 저장된 설정(muselog-metronome)이 없거나 깨진 항목은 기본값으로 읽는다
// (subdivision이 없는 예전 저장값도 ♩로 읽힌다)
export function normalizeMetronome(value) {
  const saved = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    bpm: clampBpm(saved.bpm) ?? DEFAULT_METRONOME.bpm,
    beats: BEAT_OPTIONS.includes(saved.beats) ? saved.beats : DEFAULT_METRONOME.beats,
    accents: normalizeAccents(saved),
    subdivision: SUBDIVISION_OPTIONS.some(option => option.value === saved.subdivision)
      ? saved.subdivision
      : DEFAULT_METRONOME.subdivision,
  };
}

// 박 번호의 강조를 켜거나 끈 새 목록 (원본은 바꾸지 않음)
export function toggleAccent(accents, beatNumber) {
  if (accents.includes(beatNumber)) return accents.filter(n => n !== beatNumber);
  return [...accents, beatNumber].sort((a, b) => a - b);
}

// 새 탭 시각(ms)을 더한 목록. 마지막 탭에서 2초가 지났으면 새로 시작
export function addTap(taps, now) {
  const last = taps[taps.length - 1];
  if (last === undefined || now - last > TAP_RESET_MS) return [now];
  return [...taps, now].slice(-MAX_TAPS);
}

// 탭 시각 목록 → 평균 간격으로 계산한 BPM. 탭이 2번 미만이면 null
export function calcTapBpm(taps) {
  if (taps.length < 2) return null;
  const average = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
  if (average <= 0) return null;
  return clampBpm(60000 / average);
}

// 연습 시간(초) → 기록에 저장할 분 (반올림). 1분 미만이면 0 (저장 불가)
export function elapsedToMinutes(seconds) {
  if (!Number.isFinite(seconds) || seconds < 60) return 0;
  return Math.round(seconds / 60);
}

// 초 → "분:초" (예: 185 → "3:05")
export function formatElapsed(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// 연습 기록 메모. 리듬이 ♩가 아니면 리듬 이름을 붙인다
export function metronomeNote({ bpm, beats, subdivision }) {
  const rhythm = SUBDIVISION_OPTIONS.find(option => option.value === subdivision);
  const suffix = rhythm && rhythm.value !== 1 ? ` · ${rhythm.name}` : "";
  return `메트로놈 연습 · BPM ${bpm} · ${beats}박${suffix}`;
}
