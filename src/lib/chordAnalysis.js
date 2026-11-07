// 코드 분석 계산 (순수 함수): 코드 이름 읽기, 다이아토닉 표, 진행 분석(조 찾기·도수·역할·흐름).
// 화면과 소리는 ChordAnalysis.jsx에서 한다.
import { spellNote } from "./chordChart";

const LETTER_PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pitchOf = name => (LETTER_PITCH[name[0]] + (name[1] === "#" ? 1 : name[1] === "b" ? -1 : 0) + 12) % 12;

export const MAX_PROGRESSION_CHORDS = 32;

// ---------- 코드 이름 ----------
// 구성음: [근음에서 몇 반음, 근음 글자에서 몇 글자 위]. 12반음 이상은 텐션(9·11·13)
// family: major / minor / dominant / dim / halfdim / aug / sus
const QUALITIES = {
  "": { family: "major", tones: [[0, 0], [4, 2], [7, 4]] },
  m: { family: "minor", tones: [[0, 0], [3, 2], [7, 4]] },
  7: { family: "dominant", tones: [[0, 0], [4, 2], [7, 4], [10, 6]] },
  maj7: { family: "major", tones: [[0, 0], [4, 2], [7, 4], [11, 6]] },
  m7: { family: "minor", tones: [[0, 0], [3, 2], [7, 4], [10, 6]] },
  6: { family: "major", tones: [[0, 0], [4, 2], [7, 4], [9, 5]] },
  m6: { family: "minor", tones: [[0, 0], [3, 2], [7, 4], [9, 5]] },
  9: { family: "dominant", tones: [[0, 0], [4, 2], [7, 4], [10, 6], [14, 1]] },
  maj9: { family: "major", tones: [[0, 0], [4, 2], [7, 4], [11, 6], [14, 1]] },
  m9: { family: "minor", tones: [[0, 0], [3, 2], [7, 4], [10, 6], [14, 1]] },
  11: { family: "dominant", tones: [[0, 0], [4, 2], [7, 4], [10, 6], [14, 1], [17, 3]] },
  m11: { family: "minor", tones: [[0, 0], [3, 2], [7, 4], [10, 6], [14, 1], [17, 3]] },
  13: { family: "dominant", tones: [[0, 0], [4, 2], [7, 4], [10, 6], [14, 1], [21, 5]] },
  add9: { family: "major", tones: [[0, 0], [4, 2], [7, 4], [14, 1]] },
  madd9: { family: "minor", tones: [[0, 0], [3, 2], [7, 4], [14, 1]] },
  sus2: { family: "sus", tones: [[0, 0], [2, 1], [7, 4]] },
  sus4: { family: "sus", tones: [[0, 0], [5, 3], [7, 4]] },
  "7sus4": { family: "dominant", tones: [[0, 0], [5, 3], [7, 4], [10, 6]] },
  dim: { family: "dim", tones: [[0, 0], [3, 2], [6, 4]] },
  dim7: { family: "dim", tones: [[0, 0], [3, 2], [6, 4], [9, 6]] },
  aug: { family: "aug", tones: [[0, 0], [4, 2], [8, 4]] },
  m7b5: { family: "halfdim", tones: [[0, 0], [3, 2], [6, 4], [10, 6]] },
  mmaj7: { family: "minor", tones: [[0, 0], [3, 2], [7, 4], [11, 6]] },
  "7b9": { family: "dominant", tones: [[0, 0], [4, 2], [7, 4], [10, 6], [13, 1]] },
  "7#9": { family: "dominant", tones: [[0, 0], [4, 2], [7, 4], [10, 6], [15, 1]] },
  "7#11": { family: "dominant", tones: [[0, 0], [4, 2], [7, 4], [10, 6], [18, 3]] },
  "7b13": { family: "dominant", tones: [[0, 0], [4, 2], [7, 4], [10, 6], [20, 5]] },
};

// 같은 뜻의 다른 표기
const ALIASES = {
  maj: "", M: "", min: "m", M7: "maj7", ma7: "maj7", "Δ": "maj7", "Δ7": "maj7", M9: "maj9", min7: "m7",
  sus: "sus4", "°": "dim", o: "dim", "°7": "dim7", o7: "dim7", "+": "aug", "ø": "m7b5", "ø7": "m7b5",
  mM7: "mmaj7", mmaj7: "mmaj7", "m(maj7)": "mmaj7", m7b5: "m7b5",
};

const TENSION_LABELS = { 13: "b9", 14: "9", 15: "#9", 17: "11", 18: "#11", 20: "b13", 21: "13" };

// "G7(b9)/B" → { name, root, rootPitch, quality, family, tones, bass, bassPitch }, 읽을 수 없으면 null
export function parseChord(text) {
  const match = /^([A-G](?:#|b)?)([^/]*)(?:\/([A-G](?:#|b)?))?$/.exec(text);
  if (!match) return null;
  const raw = match[2].replace(/[()]/g, "");
  const quality = Object.hasOwn(QUALITIES, raw) ? raw : ALIASES[raw];
  if (quality === undefined) return null;
  const root = match[1];
  const rootPitch = pitchOf(root);
  return {
    name: text,
    root,
    rootPitch,
    quality,
    family: QUALITIES[quality].family,
    tones: QUALITIES[quality].tones,
    bass: match[3] ?? null,
    bassPitch: match[3] ? pitchOf(match[3]) : rootPitch,
  };
}

// 띄어쓰기, |, 쉼표, -(코드 사이)로 나눈다 → { chords, invalid: [읽을 수 없는 글자], tooMany }
export function parseProgression(text) {
  const parts = text.split(/[\s|,]+|-(?=[A-G])/).filter(Boolean);
  const chords = parts.map(parseChord);
  return {
    chords: chords.filter(Boolean),
    invalid: parts.filter((_, i) => !chords[i]),
    tooMany: parts.length > MAX_PROGRESSION_CHORDS,
  };
}

// 구성음 이름 (텐션 포함, 낮은 음부터)
export function chordNoteNames(chord) {
  return chord.tones.map(([semitones, steps]) => spellNote(chord.root, semitones, steps));
}

// 코드에 들어 있는 텐션 → [{ label: "b9", note: "Ab" }]
export function chordTensions(chord) {
  return chord.tones
    .filter(([semitones]) => semitones >= 12)
    .map(([semitones, steps]) => ({ label: TENSION_LABELS[semitones], note: spellNote(chord.root, semitones, steps) }));
}

// 소리 낼 음 (MIDI, 60 = C4): 맨 앞은 베이스(C3~B3), 근음은 G3~F#4. 음원(C3~Db6)을 넘으면 한 옥타브 내린다
export function chordMidis(chord) {
  const base = 55 + ((chord.rootPitch - 7 + 12) % 12);
  const notes = chord.tones.map(([semitones]) => {
    let midi = base + semitones;
    while (midi > 84) midi -= 12;
    return midi;
  });
  return [48 + chord.bassPitch, ...new Set(notes)];
}

// ---------- 조와 다이아토닉 ----------
const MAJOR_NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const MINOR_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"];
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
const T = (label, semitones, steps) => ({ label, semitones, steps });
const TENSION = { 9: T("9", 14, 1), 11: T("11", 17, 3), 13: T("13", 21, 5), "#11": T("#11", 18, 3), b13: T("b13", 20, 5) };

// [반음, 글자, 도수, 3화음, 7화음, 기능, 쓸 수 있는 텐션]
const DEGREES = {
  major: [
    [0, 0, "I", "", "maj7", "토닉", ["9", "13"]],
    [2, 1, "ii", "m", "m7", "서브도미넌트", ["9", "11"]],
    [4, 2, "iii", "m", "m7", "토닉", ["11"]],
    [5, 3, "IV", "", "maj7", "서브도미넌트", ["9", "#11", "13"]],
    [7, 4, "V", "", "7", "도미넌트", ["9", "13"]],
    [9, 5, "vi", "m", "m7", "토닉", ["9", "11"]],
    [11, 6, "vii°", "dim", "m7b5", "도미넌트", ["11", "b13"]],
  ],
  minor: [
    [0, 0, "i", "m", "m7", "토닉", ["9", "11"]],
    [2, 1, "ii°", "dim", "m7b5", "서브도미넌트", ["11", "b13"]],
    [3, 2, "bIII", "", "maj7", "토닉", ["9", "13"]],
    [5, 3, "iv", "m", "m7", "서브도미넌트", ["9", "11"]],
    [7, 4, "v", "m", "m7", "도미넌트", ["11"]],
    [8, 5, "bVI", "", "maj7", "서브도미넌트", ["9", "#11"]],
    [10, 6, "bVII", "", "7", "서브도미넌트", ["9", "13"]],
  ],
};

// 24개 조. id = "으뜸음 높이:major/minor"
export const ANALYSIS_KEYS = ["major", "minor"].flatMap(mode =>
  (mode === "major" ? MAJOR_NAMES : MINOR_NAMES).map((tonic, pitch) => ({
    id: `${pitch}:${mode}`,
    pitch,
    mode,
    tonic,
    name: `${tonic} ${mode === "major" ? "장조" : "단조"}`,
  })),
);

export const findKey = id => ANALYSIS_KEYS.find(key => key.id === id) ?? null;

// 조의 다이아토닉 코드 7줄
export function diatonicTable(keyId) {
  const key = findKey(keyId);
  return DEGREES[key.mode].map(([semitones, steps, roman, triad, seventh, func, tensions]) => {
    const root = spellNote(key.tonic, semitones, steps);
    return {
      roman,
      triad: root + triad,
      seventh: root + seventh,
      function: func,
      tensions: tensions.map(label => ({ label, note: spellNote(root, TENSION[label].semitones, TENSION[label].steps) })),
    };
  });
}

// ---------- 진행 분석 ----------
const NUMERALS = ["I", "bII", "II", "bIII", "III", "IV", "#IV", "V", "bVI", "VI", "bVII", "VII"];
const LOWER_FAMILIES = ["minor", "dim", "halfdim"];
const ROMAN_SUFFIX = { m: "", m7: "7", m6: "6", m9: "9", m11: "11", madd9: "add9", mmaj7: "maj7", dim: "°", dim7: "°7", m7b5: "ø7", aug: "+" };

const relOf = (chord, key) => (chord.rootPitch - key.pitch + 12) % 12;
const corePitches = chord => chord.tones.filter(([s]) => s < 12).map(([s]) => (chord.rootPitch + s) % 12);
const fitsScale = (chord, key, mode = key.mode) => corePitches(chord).every(p => SCALES[mode].includes((p - key.pitch + 12) % 12));
const suffixOf = chord => ROMAN_SUFFIX[chord.quality] ?? chord.quality;
const hasDominantSeventh = chord => chord.family === "dominant" && chord.tones.some(([s]) => s === 4) && chord.tones.some(([s]) => s === 10);
const isDominantLike = chord => chord.family === "dominant" || chord.quality === "";

function romanOf(chord, rel) {
  const numeral = NUMERALS[rel];
  const cased = LOWER_FAMILIES.includes(chord.family) ? numeral.replace(/[IV]+/, m => m.toLowerCase()) : numeral;
  return cased + suffixOf(chord);
}

// 조 안의 도수 칸 (없으면 null)
function degreeRow(key, rel) {
  const index = SCALES[key.mode].indexOf(rel);
  return index === -1 ? null : DEGREES[key.mode][index];
}

function degreeTriadName(key, row) {
  return spellNote(key.tonic, row[0], row[1]) + row[3];
}

// 해결할 곳: 다이아토닉 도수이고 감화음이 아닌 곳
function targetRow(key, rel) {
  const row = degreeRow(key, rel);
  return row && row[3] !== "dim" ? row : null;
}

// 코드 하나의 도수와 역할
export function analyzeChord(chord, key) {
  const rel = relOf(chord, key);
  const roman = romanOf(chord, rel);
  if (fitsScale(chord, key)) {
    return { roman, kind: "diatonic", label: "다이아토닉", function: degreeRow(key, rel)[5], detail: "" };
  }
  if (key.mode === "minor" && isDominantLike(chord) && (rel + 5) % 12 === 0) {
    return { roman, kind: "dominant", label: "도미넌트", function: "도미넌트", detail: "화성 단음계의 V, 으뜸화음으로 돌아가는 코드" };
  }
  const parallel = key.mode === "major" ? "minor" : "major";
  if (fitsScale(chord, key, parallel) && SCALES[parallel].includes(rel)) {
    const parallelName = findKey(`${key.pitch}:${parallel}`).name;
    return { roman, kind: "borrowed", label: "차용화음", function: DEGREES[parallel][SCALES[parallel].indexOf(rel)][5], detail: `같은 으뜸음 ${parallelName}에서 빌려 온 코드` };
  }
  if (isDominantLike(chord)) {
    const target = (rel + 5) % 12;
    const row = target !== 0 ? targetRow(key, target) : null;
    if (row) {
      return {
        roman: `V${suffixOf(chord)}/${row[2]}`,
        kind: "secondary",
        label: "세컨더리 도미넌트",
        function: "도미넌트",
        detail: `${degreeTriadName(key, row)} 쪽으로 가는 도미넌트`,
      };
    }
  }
  if (hasDominantSeventh(chord)) {
    const target = (rel + 11) % 12;
    const row = targetRow(key, target);
    if (row) {
      return {
        roman: `subV${suffixOf(chord)}${target === 0 ? "" : `/${row[2]}`}`,
        kind: "subV",
        label: "트라이톤 대리",
        function: "도미넌트",
        detail: `${degreeTriadName(key, row)} 쪽으로 가는 대리 도미넌트`,
      };
    }
  }
  return { roman, kind: "outside", label: "조 밖의 코드", function: "", detail: "" };
}

const isTonicChord = (chord, key) => relOf(chord, key) === 0 && (key.mode === "major" ? chord.family === "major" : chord.family === "minor");

// 어울리는 조 점수: 조 안의 코드가 많을수록, 설명되는 조 밖 코드가 있을수록, 처음·끝이 으뜸화음일수록 높다. 같으면 장조 먼저
export function detectKey(chords) {
  let best = null;
  for (const key of ANALYSIS_KEYS) {
    let score = 0;
    for (const chord of chords) {
      const { kind } = analyzeChord(chord, key);
      if (kind === "diatonic") score += 4;
      else if (kind !== "outside") score += 1;
    }
    if (chords.length && isTonicChord(chords.at(-1), key)) score += 3;
    if (chords.length && isTonicChord(chords[0], key)) score += 2;
    if (!best || score > best.score) best = { key, score };
  }
  return best.key;
}

const fifthUp = (a, b) => (b.rootPitch - a.rootPitch + 12) % 12 === 5;
// 도착 코드의 3화음 이름: Dm7 → Dm, G7 → G, Bm7b5 → Bdim
const TRIAD_SYMBOL = { minor: "m", dim: "dim", halfdim: "dim", aug: "aug" };
const triadName = chord => chord.root + (TRIAD_SYMBOL[chord.family] ?? "");
const isTwo = chord => (chord.family === "minor" && chord.quality !== "mmaj7") || chord.family === "halfdim";

// 흐름: 투파이브(원), 도미넌트 해결, 대리 도미넌트 해결 → [{ start, end, label }]
function findFlows(chords, items, key) {
  const flows = [];
  const covered = new Set(); // 이미 투파이브로 표시한 V
  for (let i = 0; i + 1 < chords.length; i++) {
    const [a, b, c] = [chords[i], chords[i + 1], chords[i + 2]];
    if (isTwo(a) && isDominantLike(b) && fifthUp(a, b)) {
      covered.add(i + 1);
      if (c && fifthUp(b, c)) {
        const home = relOf(c, key) === 0;
        flows.push({ start: i, end: i + 2, label: home ? "투파이브원 (ii–V–I)" : `${triadName(c)} 쪽으로 가는 투파이브` });
      } else {
        const target = (b.rootPitch + 5) % 12;
        const home = target === key.pitch;
        flows.push({ start: i, end: i + 1, label: home ? "투파이브 (ii–V)" : `${spellNote(b.root, 5, 3)} 쪽으로 가는 투파이브` });
      }
    }
  }
  for (let i = 0; i + 1 < chords.length; i++) {
    if (covered.has(i)) continue;
    const [x, y] = [chords[i], chords[i + 1]];
    const { kind, function: func } = items[i];
    if (isDominantLike(x) && fifthUp(x, y) && (kind === "secondary" || kind === "dominant" || (kind === "diatonic" && func === "도미넌트"))) {
      const home = relOf(y, key) === 0;
      flows.push({ start: i, end: i + 1, label: home ? `도미넌트 해결 (V→${key.mode === "major" ? "I" : "i"})` : `${y.name} 쪽으로 해결` });
    } else if (kind === "subV" && (y.rootPitch - x.rootPitch + 12) % 12 === 11) {
      flows.push({ start: i, end: i + 1, label: "대리 도미넌트 해결" });
    }
  }
  return flows.sort((p, q) => p.start - q.start);
}

// 진행 분석. keyId가 없으면 어울리는 조를 찾는다
export function analyzeProgression(chords, keyId = null) {
  const key = (keyId && findKey(keyId)) || detectKey(chords);
  const items = chords.map(chord => ({
    chord,
    ...analyzeChord(chord, key),
    notes: chordNoteNames(chord),
    tensions: chordTensions(chord),
  }));
  return {
    key,
    fits: items.filter(item => item.kind === "diatonic").length,
    items,
    flows: findFlows(chords, items, key),
  };
}
