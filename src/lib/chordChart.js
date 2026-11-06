// 코드표·스케일표 계산 (순수 함수). 화면과 소리는 ChordChart.jsx에서 한다.
import { KEYS } from "./inspirationData";

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const LETTER_PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SOLFEGE = ["도", "레♭", "레", "미♭", "미", "파", "파#", "솔", "라♭", "라", "시♭", "시"];

function pitchOf(name) {
  const accidental = name[1] === "#" ? 1 : name[1] === "b" ? -1 : 0;
  return (LETTER_PITCH[name[0]] + accidental + 12) % 12;
}

// 근음 12개: 영감 탭의 조 이름과 같다
export const CHART_ROOTS = KEYS.map(name => ({ name, solfege: SOLFEGE[pitchOf(name)] }));

// 구성음: [근음에서 몇 반음 위, 근음 글자에서 몇 글자 위]. 글자 수로 이론에 맞는 이름(G# / Ab)을 고른다
export const CHORD_TYPES = [
  { value: "maj", label: "메이저", symbol: "", tones: [[0, 0], [4, 2], [7, 4]] },
  { value: "m", label: "m", symbol: "m", tones: [[0, 0], [3, 2], [7, 4]] },
  { value: "7", label: "7", symbol: "7", tones: [[0, 0], [4, 2], [7, 4], [10, 6]] },
  { value: "maj7", label: "maj7", symbol: "maj7", tones: [[0, 0], [4, 2], [7, 4], [11, 6]] },
  { value: "m7", label: "m7", symbol: "m7", tones: [[0, 0], [3, 2], [7, 4], [10, 6]] },
  { value: "6", label: "6", symbol: "6", tones: [[0, 0], [4, 2], [7, 4], [9, 5]] },
  { value: "sus2", label: "sus2", symbol: "sus2", tones: [[0, 0], [2, 1], [7, 4]] },
  { value: "sus4", label: "sus4", symbol: "sus4", tones: [[0, 0], [5, 3], [7, 4]] },
  { value: "add9", label: "add9", symbol: "add9", tones: [[0, 0], [4, 2], [7, 4], [14, 1]] },
  { value: "dim", label: "dim", symbol: "dim", tones: [[0, 0], [3, 2], [6, 4]] },
  { value: "aug", label: "aug", symbol: "aug", tones: [[0, 0], [4, 2], [8, 4]] },
  { value: "m7b5", label: "m7b5", symbol: "m7b5", tones: [[0, 0], [3, 2], [6, 4], [10, 6]] },
];

export const SCALE_TYPES = [
  { value: "major", label: "메이저", tones: [[0, 0], [2, 1], [4, 2], [5, 3], [7, 4], [9, 5], [11, 6]] },
  { value: "minor", label: "내추럴 마이너", tones: [[0, 0], [2, 1], [3, 2], [5, 3], [7, 4], [8, 5], [10, 6]] },
  { value: "harmonic", label: "하모닉 마이너", tones: [[0, 0], [2, 1], [3, 2], [5, 3], [7, 4], [8, 5], [11, 6]] },
  { value: "majorPenta", label: "메이저 펜타토닉", tones: [[0, 0], [2, 1], [4, 2], [7, 4], [9, 5]] },
  { value: "minorPenta", label: "마이너 펜타토닉", tones: [[0, 0], [3, 2], [5, 3], [7, 4], [10, 6]] },
  { value: "blues", label: "블루스", tones: [[0, 0], [3, 2], [5, 3], [6, 4], [7, 4], [10, 6]] },
];

// 근음 이름에서 반음·글자만큼 올라간 음의 이름. #·b가 두 개 필요하면 가까운 보통 이름(KEYS)으로 바꾼다
export function spellNote(root, semitones, steps) {
  const pitch = (pitchOf(root) + semitones) % 12;
  const letter = LETTERS[(LETTERS.indexOf(root[0]) + steps) % 7];
  let diff = (pitch - LETTER_PITCH[letter] + 12) % 12;
  if (diff > 6) diff -= 12;
  if (diff === 0) return letter;
  if (diff === 1) return `${letter}#`;
  if (diff === -1) return `${letter}b`;
  return KEYS.find(name => pitchOf(name) === pitch);
}

// (kind "chord"/"scale", 근음 이름, 종류 value) → { name, notes: [{ name, midi }] } (60 = C4)
// 코드는 근음을 C4~B4에 두고 쌓는다. 스케일은 근음부터 한 옥타브 위 근음까지
export function chartNotes(kind, root, type) {
  const base = 60 + pitchOf(root);
  const list = kind === "scale" ? SCALE_TYPES : CHORD_TYPES;
  const item = list.find(option => option.value === type) ?? list[0];
  const notes = item.tones.map(([semitones, steps]) => ({ name: spellNote(root, semitones, steps), midi: base + semitones }));
  if (kind === "scale") {
    notes.push({ name: root, midi: base + 12 });
    return { name: `${root} ${item.label}`, notes };
  }
  return { name: root + item.symbol, notes };
}

// 건반 그림: C4(60)부터 D6(86)까지
export const KEYBOARD_FIRST = 60;
export const KEYBOARD_LAST = 86;
const BLACK = new Set([1, 3, 6, 8, 10]);
export const isBlackKey = midi => BLACK.has(midi % 12);
