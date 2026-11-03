// 영감 탭 계산 (순수 함수). 무작위 값은 rng 인자로 받아 테스트에서 고정할 수 있게 한다.

import { CONCRETE_WORDS, EMOTION_WORDS } from "./inspirationData";

export const MAX_IDEA_LENGTH = 500;

// ---------- 키워드 ----------
const KEYWORD_SLOTS = [CONCRETE_WORDS, CONCRETE_WORDS, EMOTION_WORDS];

// pinned[i]가 true인 칸은 그대로 두고, 나머지는 직전 단어·다른 칸 단어와 겹치지 않게 새로 뽑는다
export function drawKeywords(current = [], pinned = [], rng = Math.random) {
  const result = KEYWORD_SLOTS.map((_, i) => (pinned[i] ? current[i] : null));
  KEYWORD_SLOTS.forEach((words, i) => {
    if (result[i]) return;
    const candidates = words.filter(word => !current.includes(word) && !result.includes(word));
    result[i] = candidates[Math.floor(rng() * candidates.length)];
  });
  return result;
}

// ---------- 코드 ----------
const SCALES = {
  C: ["C", "D", "E", "F", "G", "A", "B"],
  Db: ["Db", "Eb", "F", "Gb", "Ab", "Bb", "C"],
  D: ["D", "E", "F#", "G", "A", "B", "C#"],
  Eb: ["Eb", "F", "G", "Ab", "Bb", "C", "D"],
  E: ["E", "F#", "G#", "A", "B", "C#", "D#"],
  F: ["F", "G", "A", "Bb", "C", "D", "E"],
  "F#": ["F#", "G#", "A#", "B", "C#", "D#", "E#"],
  G: ["G", "A", "B", "C", "D", "E", "F#"],
  Ab: ["Ab", "Bb", "C", "Db", "Eb", "F", "G"],
  A: ["A", "B", "C#", "D", "E", "F#", "G#"],
  Bb: ["Bb", "C", "D", "Eb", "F", "G", "A"],
  B: ["B", "C#", "D#", "E", "F#", "G#", "A#"],
};

const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const LETTER_PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// 코드 구성음: 근음에서 몇 반음 떨어져 있는지
const CHORD_INTERVALS = {
  "": [0, 4, 7],
  m: [0, 3, 7],
  6: [0, 4, 7, 9],
  7: [0, 4, 7, 10],
  9: [0, 4, 7, 10, 14],
  maj7: [0, 4, 7, 11],
  maj9: [0, 4, 7, 11, 14],
  m7: [0, 3, 7, 10],
  m9: [0, 3, 7, 10, 14],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  add9: [0, 4, 7, 14],
};

// "5/7" → { flat: false, degree: 5, quality: "", bass: "7" }
function parseToken(token) {
  const match = /^(b?)([1-7])([^/]*)(?:\/(b?[1-7]))?$/.exec(token);
  if (!match || !(match[3] in CHORD_INTERVALS)) throw new Error(`알 수 없는 코드: ${token}`);
  return { flat: match[1] === "b", degree: Number(match[2]), quality: match[3], bass: match[4] ?? null };
}

function pitchOf(name) {
  const accidental = name[1] === "#" ? 1 : name[1] === "b" ? -1 : 0;
  return (LETTER_PITCH[name[0]] + accidental + 12) % 12;
}

function noteName(flat, degree, key) {
  const scaleNote = SCALES[key][degree - 1];
  return flat ? FLAT_NAMES[(pitchOf(scaleNote) + 11) % 12] : scaleNote;
}

// 코드 진행 글자 → 토큰 배열
export function progressionTokens(progression) {
  return progression.split(" ");
}

// ("5/7", "C") → "G/B"
export function chordName(token, key) {
  const { flat, degree, quality, bass } = parseToken(token);
  const root = noteName(flat, degree, key) + quality;
  if (!bass) return root;
  const bassFlat = bass[0] === "b";
  return `${root}/${noteName(bassFlat, Number(bass.at(-1)), key)}`;
}

export function chordNames(progression, key) {
  return progressionTokens(progression).map(token => chordName(token, key));
}

// 소리 낼 음(MIDI 번호, 60 = C4): 맨 앞은 베이스(C3~B3), 나머지는 코드 구성음(근음 C4~B4)
export function chordNotes(token, key) {
  const { flat, degree, quality, bass } = parseToken(token);
  const root = 60 + pitchOf(noteName(flat, degree, key));
  const bassPitch = bass ? pitchOf(noteName(bass[0] === "b", Number(bass.at(-1)), key)) : root % 12;
  return [48 + bassPitch, ...CHORD_INTERVALS[quality].map(interval => root + interval)];
}

// 진행 전체에 필요한 음 (겹침 없이)
export function progressionNotes(progression, key) {
  return [...new Set(progressionTokens(progression).flatMap(token => chordNotes(token, key)))];
}

// (악기, 60) → "/sounds/악기/C4.mp3" (음원 파일 이름은 반음을 b로 쓴다)
export function noteFileUrl(instrumentId, midi) {
  return `/sounds/${instrumentId}/${FLAT_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}.mp3`;
}

// ---------- 아이디어 메모 ----------
const textList = value => (Array.isArray(value) ? value.filter(item => typeof item === "string" && item) : []);

// 저장된 값이 깨져 있어도 앱이 멈추지 않도록 글자가 있는 아이디어만 남기고, 빠진 항목은 기본값으로 읽는다
export function normalizeIdeas(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(idea => idea && typeof idea.text === "string" && idea.text.trim())
    .map((idea, index) => {
      const text = idea.text.trim().slice(0, MAX_IDEA_LENGTH);
      const createdAt = typeof idea.createdAt === "string" && !Number.isNaN(Date.parse(idea.createdAt)) ? idea.createdAt : "";
      const chords = textList(idea.chords);
      return {
        id: idea.id ?? `${createdAt}-${index}-${text}`,
        createdAt,
        text,
        keywords: textList(idea.keywords),
        key: chords.length && typeof idea.key === "string" ? idea.key : "",
        chords,
      };
    });
}

// 최신순. 시각이 같으면 나중에 저장한 것이 위로, 시각을 모르면 맨 아래로
export function sortIdeas(ideas) {
  return ideas
    .map((idea, index) => ({ idea, index }))
    .sort((a, b) => b.idea.createdAt.localeCompare(a.idea.createdAt) || b.index - a.index)
    .map(({ idea }) => idea);
}

// "C조 · C G Am F", 코드가 없으면 ""
export function formatIdeaChords(idea) {
  if (!idea.chords.length) return "";
  return `${idea.key ? `${idea.key}조 · ` : ""}${idea.chords.join(" ")}`;
}

// "2026.11.3", 시각을 모르면 ""
export function formatIdeaDate(createdAt) {
  if (!createdAt) return "";
  const d = new Date(createdAt);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}
