import { describe, expect, it } from "vitest";
import { DEFAULT_DRONE, DRONE_NOTES, droneFrequencies, droneLabel, normalizeDrone, noteFrequency } from "./drone";

describe("기준음 주파수", () => {
  it("A4 = 440Hz 기준으로 계산한다", () => {
    expect(noteFrequency(9, 4)).toBeCloseTo(440);
    expect(noteFrequency(9, 3)).toBeCloseTo(220);
    expect(noteFrequency(9, 2)).toBeCloseTo(110);
    expect(noteFrequency(0, 4)).toBeCloseTo(261.63, 1); // 가운데 도
  });

  it("울림에 따라 근음 위 음을 함께 낸다", () => {
    const c3 = noteFrequency(0, 3);
    expect(droneFrequencies({ note: 0, octave: 3, mode: "root" })).toEqual([c3]);
    expect(droneFrequencies({ note: 0, octave: 3, mode: "fifth" })).toEqual([c3, noteFrequency(7, 3)]);
    expect(droneFrequencies({ note: 0, octave: 3, mode: "major" })).toEqual([c3, noteFrequency(4, 3), noteFrequency(7, 3)]);
    expect(droneFrequencies({ note: 0, octave: 3, mode: "minor" })).toEqual([c3, noteFrequency(3, 3), noteFrequency(7, 3)]);
  });

  it("옥타브를 넘는 음도 이어서 계산한다 (시 B의 5도 = 다음 옥타브 파#)", () => {
    expect(droneFrequencies({ note: 11, octave: 3, mode: "fifth" })[1]).toBeCloseTo(noteFrequency(6, 4));
  });

  it("음 이름과 주파수를 보여 준다", () => {
    expect(droneLabel({ note: 9, octave: 3 })).toBe("A3 · 220Hz");
    expect(droneLabel({ note: 0, octave: 4 })).toBe("C4 · 262Hz");
    expect(DRONE_NOTES).toHaveLength(12);
    expect(DRONE_NOTES[0]).toEqual({ value: 0, name: "C", solfege: "도" });
  });
});

describe("기준음 설정 읽기", () => {
  it("없거나 깨지면 기본값", () => {
    expect(normalizeDrone(null)).toEqual(DEFAULT_DRONE);
    expect(normalizeDrone([])).toEqual(DEFAULT_DRONE);
    expect(normalizeDrone({ note: 12, octave: 5, mode: "x", volume: "a" })).toEqual(DEFAULT_DRONE);
    expect(DEFAULT_DRONE).toEqual({ note: 9, octave: 3, mode: "root", volume: 60 });
  });

  it("올바른 값은 그대로, 음량은 0~100 정수로 맞춘다", () => {
    expect(normalizeDrone({ note: 0, octave: 2, mode: "minor", volume: 30 })).toEqual({ note: 0, octave: 2, mode: "minor", volume: 30 });
    expect(normalizeDrone({ volume: 150 }).volume).toBe(100);
    expect(normalizeDrone({ volume: -5 }).volume).toBe(0);
    expect(normalizeDrone({ volume: 33.6 }).volume).toBe(34);
  });
});
