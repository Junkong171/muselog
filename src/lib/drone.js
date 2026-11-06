// 기준음(드론) 계산 (순수 함수). 소리 재생은 Drone.jsx에서 한다.
import { A4_FREQUENCY } from "./tuner";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SOLFEGE = ["도", "도#", "레", "레#", "미", "파", "파#", "솔", "솔#", "라", "라#", "시"];

// 음 12개 (value = 도 C부터 0~11)
export const DRONE_NOTES = NOTE_NAMES.map((name, value) => ({ value, name, solfege: SOLFEGE[value] }));

// 높이: 낮게 / 보통 / 높게 = 옥타브 2 / 3 / 4
export const DRONE_OCTAVES = [
  { value: 2, label: "낮게" },
  { value: 3, label: "보통" },
  { value: 4, label: "높게" },
];

// 울림: 근음에서 몇 반음 위 음을 함께 낼지
export const DRONE_MODES = [
  { value: "root", label: "근음만", intervals: [0] },
  { value: "fifth", label: "근음+5도", intervals: [0, 7] },
  { value: "major", label: "장화음", intervals: [0, 4, 7] },
  { value: "minor", label: "단화음", intervals: [0, 3, 7] },
];

export const DEFAULT_DRONE = { note: 9, octave: 3, mode: "root", volume: 60 };

// 저장된 설정(muselog-drone)이 없거나 깨진 항목은 기본값으로 읽는다
export function normalizeDrone(value) {
  const saved = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const volume = Number.isFinite(saved.volume) ? Math.min(100, Math.max(0, Math.round(saved.volume))) : DEFAULT_DRONE.volume;
  return {
    note: Number.isInteger(saved.note) && saved.note >= 0 && saved.note <= 11 ? saved.note : DEFAULT_DRONE.note,
    octave: DRONE_OCTAVES.some(option => option.value === saved.octave) ? saved.octave : DEFAULT_DRONE.octave,
    mode: DRONE_MODES.some(option => option.value === saved.mode) ? saved.mode : DEFAULT_DRONE.mode,
    volume,
  };
}

// 음 번호(0~11)와 옥타브 → 주파수(Hz). 튜너와 같은 기준 A4 = 440Hz
export function noteFrequency(note, octave, a4 = A4_FREQUENCY) {
  const midi = (octave + 1) * 12 + note; // A4 = 69
  return a4 * 2 ** ((midi - 69) / 12);
}

// 설정 → 함께 낼 주파수 목록 (근음부터)
export function droneFrequencies({ note, octave, mode }) {
  const intervals = (DRONE_MODES.find(option => option.value === mode) ?? DRONE_MODES[0]).intervals;
  return intervals.map(semitones => noteFrequency(note + semitones, octave));
}

// 화면 표시용 "A3 · 220Hz"
export function droneLabel({ note, octave }) {
  return `${NOTE_NAMES[note]}${octave} · ${Math.round(noteFrequency(note, octave))}Hz`;
}
