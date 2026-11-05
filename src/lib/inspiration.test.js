import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  chordName,
  chordNames,
  chordNotes,
  drawKeywords,
  formatDuration,
  formatIdeaChords,
  formatIdeaDate,
  ideaChordNotes,
  MAX_IDEA_LENGTH,
  MAX_RECORD_SECONDS,
  normalizeIdeas,
  noteFileUrl,
  progressionTokens,
  sortIdeas,
} from "./inspiration";
import { CONCRETE_WORDS, EMOTION_WORDS, GENRES, INSTRUMENTS, KEYS, MOODS, PROGRESSIONS } from "./inspirationData";

describe("단어 목록", () => {
  it("구체적인 단어 100개 이상, 감정 단어 60개 이상, 겹침 없음", () => {
    expect(CONCRETE_WORDS.length).toBeGreaterThanOrEqual(100);
    expect(EMOTION_WORDS.length).toBeGreaterThanOrEqual(60);
    const all = [...CONCRETE_WORDS, ...EMOTION_WORDS];
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("drawKeywords (키워드 뽑기)", () => {
  it("앞 2칸은 구체적인 단어, 마지막 칸은 감정 단어, 서로 다르다", () => {
    for (let i = 0; i < 200; i++) {
      const [a, b, c] = drawKeywords();
      expect(CONCRETE_WORDS).toContain(a);
      expect(CONCRETE_WORDS).toContain(b);
      expect(EMOTION_WORDS).toContain(c);
      expect(a).not.toBe(b);
    }
  });

  it("고정한 칸은 그대로이고, 나머지는 직전 단어와 겹치지 않는다", () => {
    let current = drawKeywords();
    for (let i = 0; i < 200; i++) {
      const next = drawKeywords(current, [true, false, false]);
      expect(next[0]).toBe(current[0]);
      expect(current).not.toContain(next[1]);
      expect(current).not.toContain(next[2]);
      expect(next[1]).not.toBe(next[0]);
      current = next;
    }
  });

  it("모두 고정하면 그대로", () => {
    const current = ["새벽", "편의점", "미안함"];
    expect(drawKeywords(current, [true, true, true])).toEqual(current);
  });

  it("rng가 끝값이어도 항상 단어가 나온다", () => {
    [() => 0, () => 0.999999].forEach(rng => {
      expect(drawKeywords([], [], rng).every(Boolean)).toBe(true);
    });
  });
});

describe("코드 이름", () => {
  it("I V vi IV가 조에 맞게 바뀐다", () => {
    expect(chordNames("1 5 6m 4", "C")).toEqual(["C", "G", "Am", "F"]);
    expect(chordNames("1 5 6m 4", "G")).toEqual(["G", "D", "Em", "C"]);
    expect(chordNames("1 5 6m 4", "Eb")).toEqual(["Eb", "Bb", "Cm", "Ab"]);
    expect(chordNames("1 5 6m 4", "F#")).toEqual(["F#", "C#", "D#m", "B"]);
    expect(chordNames("1 5 6m 4", "Db")).toEqual(["Db", "Ab", "Bbm", "Gb"]);
  });

  it("12개 조 모두 음계대로 읽힌다", () => {
    const expected = {
      C: "C Dm Em F G Am B",
      Db: "Db Ebm Fm Gb Ab Bbm C",
      D: "D Em F#m G A Bm C#",
      Eb: "Eb Fm Gm Ab Bb Cm D",
      E: "E F#m G#m A B C#m D#",
      F: "F Gm Am Bb C Dm E",
      "F#": "F# G#m A#m B C# D#m E#",
      G: "G Am Bm C D Em F#",
      Ab: "Ab Bbm Cm Db Eb Fm G",
      A: "A Bm C#m D E F#m G#",
      Bb: "Bb Cm Dm Eb F Gm A",
      B: "B C#m D#m E F# G#m A#",
    };
    expect(Object.keys(expected)).toEqual(KEYS);
    KEYS.forEach(key => {
      expect(chordNames("1 2m 3m 4 5 6m 7", key).join(" ")).toBe(expected[key]);
    });
  });

  it("7화음, 베이스, 반음 낮춘 음", () => {
    expect(chordName("57", "C")).toBe("G7");
    expect(chordName("2m7", "F")).toBe("Gm7");
    expect(chordName("5/7", "C")).toBe("G/B");
    expect(chordName("b7", "C")).toBe("Bb");
    expect(chordName("b7", "D")).toBe("C");
    expect(chordName("b6maj7", "E")).toBe("Cmaj7");
    expect(chordName("b3maj7", "Ab")).toBe("Bmaj7");
  });

  it("모르는 코드는 오류", () => {
    expect(() => chordName("9", "C")).toThrow();
    expect(() => chordName("1xyz", "C")).toThrow();
  });
});

describe("chordNotes (소리 낼 음)", () => {
  it("C는 베이스 C3 + 도미솔", () => {
    expect(chordNotes("1", "C")).toEqual([48, 60, 64, 67]);
  });

  it("베이스가 따로면 그 음을 낸다", () => {
    expect(chordNotes("5/7", "C")[0]).toBe(59); // G/B의 B
  });

});

describe("ideaChordNotes (저장된 코드 이름 읽기)", () => {
  it("모든 진행을 12개 조로 낸 코드 이름이 영감 탭의 음과 같다", () => {
    GENRES.forEach(genre => MOODS.forEach(mood => PROGRESSIONS[genre][mood].forEach(progression => {
      KEYS.forEach(key => {
        const expected = progressionTokens(progression).map(token => chordNotes(token, key));
        expect(ideaChordNotes(chordNames(progression, key))).toEqual(expected);
      });
    })));
  });

  it("베이스, 7화음, 샵·플랫", () => {
    expect(ideaChordNotes(["G/B"])).toEqual([chordNotes("5/7", "C")]);
    expect(ideaChordNotes(["Bbmaj7"])).toEqual([chordNotes("1maj7", "Bb")]);
    expect(ideaChordNotes(["F#m7"])).toEqual([chordNotes("1m7", "F#")]);
    expect(ideaChordNotes(["E#"])).toEqual([chordNotes("7", "F#")]);
  });

  it("코드가 없거나 하나라도 읽을 수 없으면 null", () => {
    expect(ideaChordNotes([])).toBeNull();
    expect(ideaChordNotes(["C", "H"])).toBeNull();
    ["Cxyz", "C/H", "toString", "CtoString", "Cconstructor", "", "c"].forEach(name => {
      expect(ideaChordNotes([name])).toBeNull();
    });
  });
});

describe("악기 음원", () => {
  it("음 번호를 파일 주소로 바꾼다 (반음은 b)", () => {
    expect(noteFileUrl("x", 60)).toBe("/sounds/x/C4.mp3");
    expect(noteFileUrl("x", 61)).toBe("/sounds/x/Db4.mp3");
    expect(noteFileUrl("x", 48)).toBe("/sounds/x/C3.mp3");
  });

  it("악기 5개, 모든 진행을 12개 조로 낼 때 필요한 파일이 다 있다", () => {
    expect(INSTRUMENTS).toHaveLength(5);
    const missing = new Set();
    INSTRUMENTS.forEach(instrument => {
      GENRES.forEach(genre => MOODS.forEach(mood => PROGRESSIONS[genre][mood].forEach(progression => {
        KEYS.forEach(key => {
          progressionTokens(progression).flatMap(token => chordNotes(token, key)).forEach(midi => {
            const url = noteFileUrl(instrument.id, midi);
            if (!existsSync(`public${url}`)) missing.add(url);
          });
        });
      })));
    });
    expect([...missing]).toEqual([]);
  });
});

describe("코드 진행 목록", () => {
  it("장르·분위기 15개 조합마다 진행 2개 이상, 코드 4~8개, 12개 조 모두 읽힌다", () => {
    expect(GENRES).toHaveLength(5);
    expect(MOODS).toHaveLength(3);
    expect(KEYS).toHaveLength(12);
    GENRES.forEach(genre => {
      MOODS.forEach(mood => {
        const list = PROGRESSIONS[genre][mood];
        expect(list.length).toBeGreaterThanOrEqual(2);
        expect(new Set(list).size).toBe(list.length);
        list.forEach(progression => {
          const count = progressionTokens(progression).length;
          expect(count).toBeGreaterThanOrEqual(4);
          expect(count).toBeLessThanOrEqual(8);
          KEYS.forEach(key => {
            expect(chordNames(progression, key)).toHaveLength(count);
            progressionTokens(progression).forEach(token => {
              chordNotes(token, key).forEach(midi => expect(midi).toBeGreaterThanOrEqual(48));
            });
          });
        });
      });
    });
  });
});

describe("normalizeIdeas (저장된 값 정리)", () => {
  it("배열이 아니면 빈 목록", () => {
    [null, undefined, "x", 3, {}].forEach(raw => {
      expect(normalizeIdeas(raw)).toEqual([]);
    });
  });

  it("올바른 아이디어는 그대로 읽는다", () => {
    const saved = { id: 1, createdAt: "2026-11-03T01:00:00.000Z", text: "새벽의 편의점", keywords: ["새벽"], key: "C", chords: ["C", "G"], audioSeconds: 7 };
    expect(normalizeIdeas([saved])).toEqual([saved]);
  });

  it("예전 아이디어(녹음 길이 없음)는 녹음 없음(0)으로 읽는다", () => {
    const old = { id: 1, createdAt: "2026-11-03T01:00:00.000Z", text: "새벽", keywords: [], key: "", chords: [] };
    expect(normalizeIdeas([old])).toEqual([{ ...old, audioSeconds: 0 }]);
  });

  it("녹음이 있으면 글자가 없어도 남기고, 녹음 길이가 깨지면 0", () => {
    expect(normalizeIdeas([{ id: 2, audioSeconds: 7 }])).toMatchObject([{ id: 2, text: "", audioSeconds: 7 }]);
    expect(normalizeIdeas([{ id: 3, text: "", audioSeconds: 0 }, { id: 4, audioSeconds: "7" }, { id: 5, audioSeconds: -1 }])).toEqual([]);
    expect(normalizeIdeas([{ text: "글", audioSeconds: NaN }])[0].audioSeconds).toBe(0);
    expect(normalizeIdeas([{ text: "글", audioSeconds: 0.3 }])[0].audioSeconds).toBe(1);
    expect(normalizeIdeas([{ text: "글", audioSeconds: 999 }])[0].audioSeconds).toBe(MAX_RECORD_SECONDS);
  });

  it("녹음 길이 표시", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(7)).toBe("0:07");
    expect(formatDuration(125.9)).toBe("2:05");
  });

  it("글자가 없으면 버린다", () => {
    expect(normalizeIdeas([null, {}, { text: "  " }, { text: 3 }])).toEqual([]);
  });

  it("id가 없고 글자가 같아도 id가 겹치지 않는다", () => {
    const [a, b] = normalizeIdeas([{ text: "같은 글" }, { text: "같은 글" }]);
    expect(a.id).not.toBe(b.id);
  });

  it("빠지거나 깨진 항목은 기본값, 긴 글자는 자른다", () => {
    const [idea] = normalizeIdeas([{ text: "가".repeat(MAX_IDEA_LENGTH + 5), createdAt: "언젠가", keywords: "x", key: "C", chords: "y" }]);
    expect(idea.id).toBeTruthy();
    expect(idea.text).toHaveLength(MAX_IDEA_LENGTH);
    expect(idea).toMatchObject({ createdAt: "", keywords: [], key: "", chords: [] });
  });
});

describe("sortIdeas · 보이는 글자", () => {
  it("최신순, 시각이 같으면 나중에 저장한 것이 위, 시각 모르면 맨 아래", () => {
    const list = [
      { text: "모름", createdAt: "" },
      { text: "옛날", createdAt: "2026-01-01T00:00:00.000Z" },
      { text: "최근1", createdAt: "2026-11-03T00:00:00.000Z" },
      { text: "최근2", createdAt: "2026-11-03T00:00:00.000Z" },
    ];
    expect(sortIdeas(list).map(i => i.text)).toEqual(["최근2", "최근1", "옛날", "모름"]);
    expect(list[0].text).toBe("모름"); // 원본은 그대로
  });

  it("코드 글자와 날짜", () => {
    expect(formatIdeaChords({ key: "C", chords: ["C", "G", "Am", "F"] })).toBe("C조 · C G Am F");
    expect(formatIdeaChords({ key: "", chords: [] })).toBe("");
    expect(formatIdeaDate(new Date(2026, 10, 3, 12).toISOString())).toBe("2026.11.3");
    expect(formatIdeaDate("")).toBe("");
  });
});
