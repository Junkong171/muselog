import { describe, expect, it } from "vitest";
import {
  addTap,
  calcTapBpm,
  clampBpm,
  DEFAULT_METRONOME,
  elapsedToMinutes,
  formatElapsed,
  metronomeNote,
  normalizeMetronome,
  toggleAccent,
} from "./metronome";

describe("clampBpm", () => {
  it("10~300 범위의 정수로 맞춘다", () => {
    expect(clampBpm(120)).toBe(120);
    expect(clampBpm(99.6)).toBe(100);
    expect(clampBpm(5)).toBe(10);
    expect(clampBpm(10)).toBe(10);
    expect(clampBpm(300)).toBe(300);
    expect(clampBpm(500)).toBe(300);
    expect(clampBpm("90")).toBe(90);
  });

  it("숫자가 아니면 null", () => {
    [undefined, null, "", "빠르게", NaN, Infinity, true, {}].forEach(value => {
      expect(clampBpm(value)).toBeNull();
    });
  });
});

describe("normalizeMetronome (저장된 설정 읽기)", () => {
  it("올바른 설정은 그대로", () => {
    expect(normalizeMetronome({ bpm: 90, beats: 3, accents: [2, 3], subdivision: 3 }))
      .toEqual({ bpm: 90, beats: 3, accents: [2, 3], subdivision: 3 });
    expect(normalizeMetronome({ bpm: 90, beats: 3, accents: [], subdivision: 1 }).accents).toEqual([]);
  });

  it("없거나 깨진 값은 기본값 (BPM 120, 4박, 1번 박만 강조, 리듬 ♩)", () => {
    expect(DEFAULT_METRONOME).toEqual({ bpm: 120, beats: 4, accents: [1], subdivision: 1 });
    [undefined, null, "", 120, "abc", [], [90, 3]].forEach(value => {
      expect(normalizeMetronome(value)).toEqual(DEFAULT_METRONOME);
    });
  });

  it("깨진 항목만 기본값으로 바꾼다", () => {
    expect(normalizeMetronome({ bpm: "빠름", beats: 3, accents: [3], subdivision: 2 }))
      .toEqual({ bpm: 120, beats: 3, accents: [3], subdivision: 2 });
    expect(normalizeMetronome({ bpm: 90, beats: 5, accents: "1,3", subdivision: 4 }))
      .toEqual({ bpm: 90, beats: 4, accents: [1], subdivision: 4 });
    expect(normalizeMetronome({ bpm: 90, beats: "3" })).toEqual({ bpm: 90, beats: 4, accents: [1], subdivision: 1 });
  });

  it("강조할 박 목록에서 1~6이 아닌 값과 중복은 버리고 정렬한다", () => {
    expect(normalizeMetronome({ accents: [3, 1, 3, 0, 7, "2", 1.5, null] }).accents).toEqual([1, 3]);
    expect(normalizeMetronome({ accents: [6, 5] }).accents).toEqual([5, 6]);
  });

  it("예전 형식 accent(true/false)는 accents로 바꾼다 (마이그레이션)", () => {
    const fromTrue = normalizeMetronome({ bpm: 90, beats: 3, accent: true });
    expect(fromTrue).toEqual({ bpm: 90, beats: 3, accents: [1], subdivision: 1 });
    expect(fromTrue).not.toHaveProperty("accent");
    expect(normalizeMetronome({ bpm: 90, beats: 3, accent: false, subdivision: 2 }).accents).toEqual([]);
    expect(normalizeMetronome({ accent: "yes" }).accents).toEqual([1]);
    // 새 형식이 있으면 예전 값보다 새 형식을 따른다
    expect(normalizeMetronome({ accent: true, accents: [2] }).accents).toEqual([2]);
  });

  it("리듬이 없거나(예전 저장값) 깨졌으면 ♩", () => {
    expect(normalizeMetronome({ bpm: 90, beats: 3, accents: [] }).subdivision).toBe(1);
    [0, 5, "2", null, 1.5].forEach(subdivision => {
      expect(normalizeMetronome({ subdivision }).subdivision).toBe(1);
    });
  });

  it("범위 밖 BPM은 10~300으로 맞춘다", () => {
    expect(normalizeMetronome({ bpm: 5 }).bpm).toBe(10);
    expect(normalizeMetronome({ bpm: 999 }).bpm).toBe(300);
  });
});

describe("toggleAccent (박 강조 켜고 끄기)", () => {
  it("없는 번호는 켜고 정렬, 있는 번호는 끈다", () => {
    expect(toggleAccent([1], 3)).toEqual([1, 3]);
    expect(toggleAccent([3], 2)).toEqual([2, 3]);
    expect(toggleAccent([1, 3], 1)).toEqual([3]);
    expect(toggleAccent([3], 3)).toEqual([]);
  });

  it("원본 목록을 바꾸지 않는다", () => {
    const accents = [1];
    toggleAccent(accents, 2);
    toggleAccent(accents, 1);
    expect(accents).toEqual([1]);
  });
});

describe("탭 템포 (addTap, calcTapBpm)", () => {
  it("0.5초 간격이면 120", () => {
    expect(calcTapBpm([0, 500, 1000, 1500])).toBe(120);
  });

  it("탭이 2번 미만이면 null", () => {
    expect(calcTapBpm([])).toBeNull();
    expect(calcTapBpm([1000])).toBeNull();
  });

  it("결과는 반올림하고 10~300으로 맞춘다", () => {
    expect(calcTapBpm([0, 700])).toBe(86); // 85.7
    expect(calcTapBpm([0, 100])).toBe(300); // 600
    expect(calcTapBpm([0, 1900])).toBe(32); // 31.6
  });

  it("최근 탭 5번(간격 4번)까지만 남긴다", () => {
    let taps = [];
    [0, 1000, 2000, 2500, 3000, 3500, 4000].forEach(t => {
      taps = addTap(taps, t);
    });
    expect(taps).toEqual([2000, 2500, 3000, 3500, 4000]);
    expect(calcTapBpm(taps)).toBe(120);
  });

  it("마지막 탭에서 2초가 지나면 새로 센다", () => {
    expect(addTap([0, 500], 2500)).toEqual([0, 500, 2500]);
    expect(addTap([0, 500], 2501)).toEqual([2501]);
    expect(calcTapBpm(addTap([0, 500], 5000))).toBeNull();
  });

  it("원본 목록을 바꾸지 않는다", () => {
    const taps = [0, 500];
    addTap(taps, 1000);
    expect(taps).toEqual([0, 500]);
  });
});

describe("elapsedToMinutes, formatElapsed", () => {
  it("1분 미만은 0 (저장 불가)", () => {
    expect(elapsedToMinutes(0)).toBe(0);
    expect(elapsedToMinutes(59.9)).toBe(0);
    expect(elapsedToMinutes(NaN)).toBe(0);
  });

  it("1분 이상은 분으로 반올림", () => {
    expect(elapsedToMinutes(60)).toBe(1);
    expect(elapsedToMinutes(89)).toBe(1);
    expect(elapsedToMinutes(90)).toBe(2);
    expect(elapsedToMinutes(600)).toBe(10);
  });

  it("분:초 형식", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(185.7)).toBe("3:05");
    expect(formatElapsed(3600)).toBe("60:00");
  });
});

describe("metronomeNote", () => {
  it("설정이 들어간 메모 (♩이면 리듬 이름 없음)", () => {
    expect(metronomeNote({ bpm: 120, beats: 4, subdivision: 1 })).toBe("메트로놈 연습 · BPM 120 · 4박");
    expect(metronomeNote({ bpm: 120, beats: 4 })).toBe("메트로놈 연습 · BPM 120 · 4박");
  });

  it("리듬이 ♩가 아니면 리듬 이름을 붙인다", () => {
    expect(metronomeNote({ bpm: 90, beats: 3, subdivision: 2 })).toBe("메트로놈 연습 · BPM 90 · 3박 · 8분음표");
    expect(metronomeNote({ bpm: 90, beats: 3, subdivision: 3 })).toBe("메트로놈 연습 · BPM 90 · 3박 · 셋잇단음표");
    expect(metronomeNote({ bpm: 90, beats: 3, subdivision: 4 })).toBe("메트로놈 연습 · BPM 90 · 3박 · 16분음표");
  });
});
