import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHART_ROOTS, CHORD_TYPES, chartNotes, isBlackKey, KEYBOARD_FIRST, KEYBOARD_LAST, SCALE_TYPES, spellNote } from "./chordChart";
import { noteFileUrl } from "./inspiration";
import { KEYS } from "./inspirationData";

const names = (kind, root, type) => chartNotes(kind, root, type).notes.map(note => note.name);
const intervals = list => list.map(item => item.tones.map(([semitones]) => semitones));

describe("코드표·스케일표 목록", () => {
  it("근음 12개는 영감 탭 조 이름과 같고 계이름이 붙는다", () => {
    expect(CHART_ROOTS.map(root => root.name)).toEqual(KEYS);
    expect(CHART_ROOTS[0]).toEqual({ name: "C", solfege: "도" });
    expect(CHART_ROOTS[1]).toEqual({ name: "Db", solfege: "레♭" });
  });

  it("코드 12가지의 구성음", () => {
    expect(CHORD_TYPES.map(type => type.symbol)).toEqual(["", "m", "7", "maj7", "m7", "6", "sus2", "sus4", "add9", "dim", "aug", "m7b5"]);
    expect(intervals(CHORD_TYPES)).toEqual([
      [0, 4, 7], [0, 3, 7], [0, 4, 7, 10], [0, 4, 7, 11], [0, 3, 7, 10], [0, 4, 7, 9],
      [0, 2, 7], [0, 5, 7], [0, 4, 7, 14], [0, 3, 6], [0, 4, 8], [0, 3, 6, 10],
    ]);
  });

  it("스케일 6가지의 구성음", () => {
    expect(SCALE_TYPES.map(type => type.label)).toEqual(["메이저", "내추럴 마이너", "하모닉 마이너", "메이저 펜타토닉", "마이너 펜타토닉", "블루스"]);
    expect(intervals(SCALE_TYPES)).toEqual([
      [0, 2, 4, 5, 7, 9, 11], [0, 2, 3, 5, 7, 8, 10], [0, 2, 3, 5, 7, 8, 11],
      [0, 2, 4, 7, 9], [0, 3, 5, 7, 10], [0, 3, 5, 6, 7, 10],
    ]);
  });
});

describe("이름과 구성음", () => {
  it("코드 이름 = 근음 + 기호", () => {
    expect(chartNotes("chord", "A", "m7").name).toBe("Am7");
    expect(chartNotes("chord", "C", "maj").name).toBe("C");
    expect(chartNotes("chord", "F#", "dim").name).toBe("F#dim");
    expect(chartNotes("scale", "A", "minor").name).toBe("A 내추럴 마이너");
  });

  it("이론에 맞는 글자로 적는다", () => {
    expect(names("chord", "A", "m7")).toEqual(["A", "C", "E", "G"]);
    expect(names("chord", "Eb", "m")).toEqual(["Eb", "Gb", "Bb"]);
    expect(names("chord", "E", "maj")).toEqual(["E", "G#", "B"]);
    expect(names("chord", "B", "m7b5")).toEqual(["B", "D", "F", "A"]);
    expect(names("scale", "F", "major")).toEqual(["F", "G", "A", "Bb", "C", "D", "E", "F"]);
    expect(names("scale", "A", "blues")).toEqual(["A", "C", "D", "Eb", "E", "G", "A"]);
    expect(names("scale", "F#", "major")).toEqual(["F#", "G#", "A#", "B", "C#", "D#", "E#", "F#"]);
  });

  it("#·b가 두 개 필요하면 가까운 보통 이름", () => {
    expect(names("chord", "Db", "dim")).toEqual(["Db", "Fb", "G"]); // Fb는 b 하나라 그대로, Abb는 G
  });

  it("spellNote", () => {
    expect(spellNote("Db", 3, 2)).toBe("Fb");
    expect(spellNote("Db", 6, 4)).toBe("G");
    expect(spellNote("F#", 8, 4)).toBe("D");
  });

  it("코드는 근음을 C4~B4에, 스케일은 한 옥타브 위 근음까지", () => {
    expect(chartNotes("chord", "C", "maj").notes.map(note => note.midi)).toEqual([60, 64, 67]);
    expect(chartNotes("chord", "B", "add9").notes.map(note => note.midi)).toEqual([71, 75, 78, 85]);
    const scale = chartNotes("scale", "B", "major").notes.map(note => note.midi);
    expect(scale[0]).toBe(71);
    expect(scale.at(-1)).toBe(83);
  });
});

describe("건반과 음원", () => {
  it("건반 그림 C4~D6, 흰 건반 16개", () => {
    const keys = Array.from({ length: KEYBOARD_LAST - KEYBOARD_FIRST + 1 }, (_, i) => KEYBOARD_FIRST + i);
    expect(keys.filter(midi => !isBlackKey(midi))).toHaveLength(16);
  });

  it("모든 근음 × 모든 종류의 음이 건반 안에 있고 피아노 음원 파일이 있다", () => {
    const missing = new Set();
    KEYS.forEach(root => {
      [["chord", CHORD_TYPES], ["scale", SCALE_TYPES]].forEach(([kind, list]) => list.forEach(type => {
        chartNotes(kind, root, type.value).notes.forEach(({ midi }) => {
          expect(midi).toBeGreaterThanOrEqual(KEYBOARD_FIRST);
          expect(midi).toBeLessThanOrEqual(KEYBOARD_LAST);
          const url = noteFileUrl("acoustic_grand_piano", midi);
          if (!existsSync(`public${url}`)) missing.add(url);
        });
      }));
    });
    expect([...missing]).toEqual([]);
  });
});
