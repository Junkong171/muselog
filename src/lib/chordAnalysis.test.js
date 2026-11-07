import { describe, expect, it } from "vitest";
import {
  analyzeProgression,
  chordMidis,
  chordNoteNames,
  chordTensions,
  detectKey,
  diatonicTable,
  parseChord,
  parseProgression,
} from "./chordAnalysis";
import { normalizeChordAnalysis } from "./chordAnalysisSettings";

const chords = text => parseProgression(text).chords;
const brief = rows => rows.map(row => [row.roman, row.triad, row.seventh, row.function, row.tensions.map(t => `${t.label}(${t.note})`).join(", ")]);

describe("코드 이름 읽기", () => {
  it("여러 표기를 읽는다", () => {
    expect(parseChord("C").quality).toBe("");
    expect(parseChord("CM7").quality).toBe("maj7");
    expect(parseChord("CΔ").quality).toBe("maj7");
    expect(parseChord("Bø").quality).toBe("m7b5");
    expect(parseChord("Bm7(b5)").quality).toBe("m7b5");
    expect(parseChord("G7(b9)").quality).toBe("7b9");
    expect(parseChord("C+").quality).toBe("aug");
    expect(parseChord("F#m7/C#")).toMatchObject({ root: "F#", rootPitch: 6, quality: "m7", bass: "C#", bassPitch: 1 });
    expect(parseChord("Cx7")).toBeNull();
    expect(parseChord("H")).toBeNull();
  });

  it("진행 나누기: 띄어쓰기, |, 쉼표, -", () => {
    expect(chords("C | G/B, Am7-F").map(c => c.name)).toEqual(["C", "G/B", "Am7", "F"]);
    expect(parseProgression("C Cx7 G").invalid).toEqual(["Cx7"]);
    expect(parseProgression(Array(33).fill("C").join(" ")).tooMany).toBe(true);
    expect(parseProgression(Array(32).fill("C").join(" ")).tooMany).toBe(false);
  });

  it("구성음과 텐션", () => {
    expect(chordNoteNames(parseChord("G7"))).toEqual(["G", "B", "D", "F"]);
    expect(chordNoteNames(parseChord("Bm7b5"))).toEqual(["B", "D", "F", "A"]);
    expect(chordNoteNames(parseChord("Bdim7"))).toEqual(["B", "D", "F", "Ab"]);
    expect(chordTensions(parseChord("G7b9"))).toEqual([{ label: "b9", note: "Ab" }]);
    expect(chordTensions(parseChord("C13"))).toEqual([{ label: "9", note: "D" }, { label: "13", note: "A" }]);
    expect(chordTensions(parseChord("Cmaj7"))).toEqual([]);
  });

  it("소리 낼 음은 음원 범위(C3~Db6) 안", () => {
    for (const name of ["C", "B13", "F#maj9", "Bb7#11", "Ab/C"]) {
      const midis = chordMidis(parseChord(name));
      expect(Math.min(...midis)).toBeGreaterThanOrEqual(48);
      expect(Math.max(...midis)).toBeLessThanOrEqual(85);
    }
    expect(chordMidis(parseChord("G/B"))[0]).toBe(59);
  });
});

describe("켜기·끄기 설정", () => {
  it("없거나 깨지면 켜짐", () => {
    expect(normalizeChordAnalysis(null)).toEqual({ on: true });
    expect(normalizeChordAnalysis("x")).toEqual({ on: true });
    expect(normalizeChordAnalysis({ on: "no" })).toEqual({ on: true });
    expect(normalizeChordAnalysis({ on: false })).toEqual({ on: false });
  });
});

describe("다이아토닉", () => {
  it("C 장조", () => {
    expect(brief(diatonicTable("0:major"))).toEqual([
      ["I", "C", "Cmaj7", "토닉", "9(D), 13(A)"],
      ["ii", "Dm", "Dm7", "서브도미넌트", "9(E), 11(G)"],
      ["iii", "Em", "Em7", "토닉", "11(A)"],
      ["IV", "F", "Fmaj7", "서브도미넌트", "9(G), #11(B), 13(D)"],
      ["V", "G", "G7", "도미넌트", "9(A), 13(E)"],
      ["vi", "Am", "Am7", "토닉", "9(B), 11(D)"],
      ["vii°", "Bdim", "Bm7b5", "도미넌트", "11(E), b13(G)"],
    ]);
  });

  it("A 단조", () => {
    expect(brief(diatonicTable("9:minor"))).toEqual([
      ["i", "Am", "Am7", "토닉", "9(B), 11(D)"],
      ["ii°", "Bdim", "Bm7b5", "서브도미넌트", "11(E), b13(G)"],
      ["bIII", "C", "Cmaj7", "토닉", "9(D), 13(A)"],
      ["iv", "Dm", "Dm7", "서브도미넌트", "9(E), 11(G)"],
      ["v", "Em", "Em7", "도미넌트", "11(A)"],
      ["bVI", "F", "Fmaj7", "서브도미넌트", "9(G), #11(B)"],
      ["bVII", "G", "G7", "서브도미넌트", "9(A), 13(E)"],
    ]);
  });

  it("샵·플랫 조도 이론에 맞는 이름", () => {
    expect(diatonicTable("6:major").map(row => row.triad)).toEqual(["F#", "G#m", "A#m", "B", "C#", "D#m", "E#dim"]);
    expect(diatonicTable("3:major").map(row => row.seventh)).toEqual(["Ebmaj7", "Fm7", "Gm7", "Abmaj7", "Bb7", "Cm7", "Dm7b5"]);
  });
});

describe("진행 분석", () => {
  it("조 찾기", () => {
    expect(detectKey(chords("C G/B Am7 D7 G7 C")).name).toBe("C 장조");
    expect(detectKey(chords("C G Am F")).name).toBe("C 장조");
    expect(detectKey(chords("Am F C G")).name).toBe("A 단조");
    expect(detectKey(chords("G D Em C")).name).toBe("G 장조");
    expect(detectKey(chords("C Fm C Db7 C")).name).toBe("C 장조");
  });

  it("도수와 역할", () => {
    const result = analyzeProgression(chords("C G/B Am7 D7 G7 C"));
    expect(result.key.name).toBe("C 장조");
    expect(result.fits).toBe(5);
    expect(result.items.map(item => [item.roman, item.kind])).toEqual([
      ["I", "diatonic"], ["V", "diatonic"], ["vi7", "diatonic"], ["V7/V", "secondary"], ["V7", "diatonic"], ["I", "diatonic"],
    ]);
    expect(result.items[3].detail).toBe("G 쪽으로 가는 도미넌트");
    expect(result.items[4].function).toBe("도미넌트");
  });

  it("차용화음과 트라이톤 대리", () => {
    const items = analyzeProgression(chords("C Fm Bb Ab Db7 C"), "0:major").items;
    expect(items.map(item => [item.roman, item.kind])).toEqual([
      ["I", "diatonic"], ["iv", "borrowed"], ["bVII", "borrowed"], ["bVI", "borrowed"], ["subV7", "subV"], ["I", "diatonic"],
    ]);
    expect(items[1].detail).toBe("같은 으뜸음 C 단조에서 빌려 온 코드");
    expect(items[4].detail).toBe("C 쪽으로 가는 대리 도미넌트");
  });

  it("단조의 V7과 조 밖의 코드, 텐션", () => {
    const items = analyzeProgression(chords("Am E7b9 Am F#7 C#"), "9:minor").items;
    expect(items[1]).toMatchObject({ roman: "V7b9", kind: "dominant", tensions: [{ label: "b9", note: "F" }] });
    expect(items[3]).toMatchObject({ roman: "subV7/bVI", kind: "subV", detail: "F 쪽으로 가는 대리 도미넌트" });
    expect(items[4]).toMatchObject({ roman: "III", kind: "outside", label: "조 밖의 코드" });
  });

  it("흐름: 투파이브원, 다른 조로 가는 투파이브, 도미넌트 해결", () => {
    const result = analyzeProgression(chords("Cmaj7 Em7 A7 Dm7 G7 Cmaj7"));
    expect(result.key.name).toBe("C 장조");
    expect(result.items[2]).toMatchObject({ roman: "V7/ii", kind: "secondary" });
    expect(result.flows).toEqual([
      { start: 1, end: 3, label: "Dm 쪽으로 가는 투파이브" },
      { start: 3, end: 5, label: "투파이브원 (ii–V–I)" },
    ]);
    expect(analyzeProgression(chords("F#m7b5 B7 Em7"), "0:major").flows).toEqual([{ start: 0, end: 2, label: "Em 쪽으로 가는 투파이브" }]);
    expect(analyzeProgression(chords("Dm7 G7"), "0:major").flows).toEqual([{ start: 0, end: 1, label: "투파이브 (ii–V)" }]);
    expect(analyzeProgression(chords("C E7 Am"), "0:major").flows).toEqual([{ start: 1, end: 2, label: "Am 쪽으로 해결" }]);
    expect(analyzeProgression(chords("F G7 C"), "0:major").flows).toEqual([{ start: 1, end: 2, label: "도미넌트 해결 (V→I)" }]);
    expect(analyzeProgression(chords("Dm7 Db7 C"), "0:major").flows).toEqual([{ start: 1, end: 2, label: "대리 도미넌트 해결" }]);
  });
});
