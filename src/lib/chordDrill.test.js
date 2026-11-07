import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHORD_DRILL,
  diatonicChords,
  drillPool,
  normalizeChordDrill,
  pickChord,
  toggleDrillType,
} from "./chordDrill";

describe("코드 전환 연습", () => {
  it("장조 다이아토닉 코드", () => {
    expect(diatonicChords("C", false)).toEqual(["C", "Dm", "Em", "F", "G", "Am", "Bdim"]);
    expect(diatonicChords("C", true)).toEqual(["Cmaj7", "Dm7", "Em7", "Fmaj7", "G7", "Am7", "Bm7b5"]);
    expect(diatonicChords("Bb", false)).toEqual(["Bb", "Cm", "Dm", "Eb", "F", "Gm", "Adim"]);
    expect(diatonicChords("F#", false)).toEqual(["F#", "G#m", "A#m", "B", "C#", "D#m", "E#dim"]);
  });

  it("설정 읽기: 없거나 깨지면 기본값", () => {
    expect(normalizeChordDrill(null)).toEqual(DEFAULT_CHORD_DRILL);
    expect(normalizeChordDrill("x")).toEqual(DEFAULT_CHORD_DRILL);
    expect(normalizeChordDrill({ scope: "key", types: ["m7", "7", "zz"], key: "Eb", sevenths: true, bpm: 300, beats: 8, click: false }))
      .toEqual({ scope: "key", types: ["7", "m7"], key: "Eb", sevenths: true, bpm: 200, beats: 8, click: false });
    expect(normalizeChordDrill({ scope: "?", types: [], key: "H", sevenths: 1, bpm: 10, beats: 3, click: "y" }))
      .toEqual({ ...DEFAULT_CHORD_DRILL, bpm: 40 });
  });

  it("코드 종류 켜고 끄기 (마지막 하나는 남김)", () => {
    expect(toggleDrillType(["maj", "m"], "m")).toEqual(["maj"]);
    expect(toggleDrillType(["maj"], "maj")).toEqual(["maj"]);
    expect(toggleDrillType(["m7"], "maj")).toEqual(["maj", "m7"]);
  });

  it("뽑을 코드 목록", () => {
    const all = drillPool({ ...DEFAULT_CHORD_DRILL, types: ["maj", "m7"] });
    expect(all).toHaveLength(24);
    expect(all.slice(0, 4)).toEqual(["C", "Cm7", "Db", "Dbm7"]);
    expect(drillPool({ ...DEFAULT_CHORD_DRILL, scope: "key", key: "G", sevenths: true })).toEqual(["Gmaj7", "Am7", "Bm7", "Cmaj7", "D7", "Em7", "F#m7b5"]);
  });

  it("같은 코드는 연달아 뽑지 않는다", () => {
    const pool = ["C", "F", "G"];
    expect(pickChord(pool, "C", () => 0)).toBe("F");
    expect(pickChord(pool, "C", () => 0.999)).toBe("G");
    expect(pickChord(pool, null, () => 0)).toBe("C");
    for (let i = 0; i < 50; i++) expect(pickChord(pool, "F")).not.toBe("F");
    expect(pickChord(["C"], "C")).toBe("C");
  });
});
