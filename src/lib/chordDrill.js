// 코드 전환 연습 계산 (순수 함수). 박 소리와 화면은 ChordDrill.jsx에서 한다.
import { spellNote } from "./chordChart";
import { KEYS } from "./inspirationData";

export const DRILL_MIN_BPM = 40;
export const DRILL_MAX_BPM = 200;
export const DRILL_BEAT_OPTIONS = [2, 4, 8];

// "전체"에서 고를 수 있는 코드 종류
export const DRILL_TYPES = [
  { value: "maj", label: "메이저", symbol: "" },
  { value: "m", label: "m", symbol: "m" },
  { value: "7", label: "7", symbol: "7" },
  { value: "maj7", label: "maj7", symbol: "maj7" },
  { value: "m7", label: "m7", symbol: "m7" },
];

export const DRILL_KEYS = KEYS;

export const DEFAULT_CHORD_DRILL = { scope: "all", types: ["maj", "m"], key: "C", sevenths: false, bpm: 80, beats: 4, click: true };

// 장조 음계: [근음에서 몇 반음, 몇 글자 위]와 그 자리의 3화음·7화음 종류
const MAJOR_DEGREES = [
  [0, 0, "", "maj7"],
  [2, 1, "m", "m7"],
  [4, 2, "m", "m7"],
  [5, 3, "", "maj7"],
  [7, 4, "", "7"],
  [9, 5, "m", "m7"],
  [11, 6, "dim", "m7b5"],
];

// 장조의 다이아토닉 코드 7개 이름. ("C", false) → C Dm Em F G Am Bdim
export function diatonicChords(key, sevenths) {
  return MAJOR_DEGREES.map(([semitones, steps, triad, seventh]) => spellNote(key, semitones, steps) + (sevenths ? seventh : triad));
}

export function clampDrillBpm(value) {
  const n = Number(value);
  if (value === null || value === "" || typeof value === "boolean" || !Number.isFinite(n)) return null;
  return Math.min(DRILL_MAX_BPM, Math.max(DRILL_MIN_BPM, Math.round(n)));
}

// 저장된 설정(muselog-chord-drill)이 없거나 깨진 항목은 기본값으로 읽는다
export function normalizeChordDrill(value) {
  const saved = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const known = DRILL_TYPES.map(type => type.value);
  const types = Array.isArray(saved.types) ? known.filter(type => saved.types.includes(type)) : [];
  return {
    scope: saved.scope === "key" ? "key" : "all",
    types: types.length ? types : [...DEFAULT_CHORD_DRILL.types],
    key: DRILL_KEYS.includes(saved.key) ? saved.key : DEFAULT_CHORD_DRILL.key,
    sevenths: typeof saved.sevenths === "boolean" ? saved.sevenths : DEFAULT_CHORD_DRILL.sevenths,
    bpm: clampDrillBpm(saved.bpm) ?? DEFAULT_CHORD_DRILL.bpm,
    beats: DRILL_BEAT_OPTIONS.includes(saved.beats) ? saved.beats : DEFAULT_CHORD_DRILL.beats,
    click: typeof saved.click === "boolean" ? saved.click : DEFAULT_CHORD_DRILL.click,
  };
}

// 코드 종류 켜기·끄기. 마지막 하나는 끌 수 없다
export function toggleDrillType(types, value) {
  if (types.includes(value)) return types.length > 1 ? types.filter(type => type !== value) : types;
  return DRILL_TYPES.map(type => type.value).filter(type => type === value || types.includes(type));
}

// 설정으로 뽑을 수 있는 코드 이름 목록
export function drillPool(settings) {
  if (settings.scope === "key") return diatonicChords(settings.key, settings.sevenths);
  const symbols = DRILL_TYPES.filter(type => settings.types.includes(type.value)).map(type => type.symbol);
  return DRILL_KEYS.flatMap(root => symbols.map(symbol => root + symbol));
}

// 목록에서 하나를 뽑는다. 바로 앞 코드와 같은 것은 뽑지 않는다 (목록에 하나뿐이면 그대로)
export function pickChord(pool, previous = null, rng = Math.random) {
  const choices = pool.length > 1 ? pool.filter(chord => chord !== previous) : pool;
  return choices[Math.min(choices.length - 1, Math.floor(rng() * choices.length))];
}
