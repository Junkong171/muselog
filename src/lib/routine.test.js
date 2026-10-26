import { describe, expect, it } from "vitest";
import { MAX_ROUTINE_TITLE, normalizeRoutine, routineProgress, todayChecks, toggleCheck } from "./routine";

const items = [
  { id: 1, title: "크로매틱 워밍업" },
  { id: 2, title: "메이저 스케일" },
  { id: 3, title: "코드 체인지" },
];

describe("normalizeRoutine (저장된 루틴 목록 읽기)", () => {
  it("올바른 목록은 순서 그대로", () => {
    expect(normalizeRoutine(items)).toEqual(items);
  });

  it("없거나 배열이 아니면 빈 목록", () => {
    [undefined, null, "", "abc", 3, {}, { 0: items[0] }].forEach(value => {
      expect(normalizeRoutine(value)).toEqual([]);
    });
  });

  it("이름이 없거나 문자열이 아닌 항목, id가 숫자가 아니거나 겹치는 항목은 버린다", () => {
    const broken = [
      { id: 1, title: "워밍업" },
      { id: 2, title: "   " },
      { id: 3, title: 123 },
      { id: "4", title: "스케일" },
      { id: 1, title: "중복 id" },
      null,
      "문자열",
      { id: 5 },
      { id: 6, title: "코드" },
    ];
    expect(normalizeRoutine(broken)).toEqual([{ id: 1, title: "워밍업" }, { id: 6, title: "코드" }]);
  });

  it("이름은 앞뒤 공백을 빼고 최대 40자", () => {
    const long = "가".repeat(50);
    expect(normalizeRoutine([{ id: 1, title: "  스케일  " }])[0].title).toBe("스케일");
    expect(normalizeRoutine([{ id: 1, title: long }])[0].title).toHaveLength(MAX_ROUTINE_TITLE);
  });
});

describe("todayChecks (오늘 체크한 항목)", () => {
  it("날짜가 오늘이면 체크한 id 그대로", () => {
    expect(todayChecks({ date: "2026-10-26", done: [1, 3] }, "2026-10-26", items)).toEqual([1, 3]);
  });

  it("날짜가 바뀌면 체크 없음 (초기화)", () => {
    expect(todayChecks({ date: "2026-10-25", done: [1, 2, 3] }, "2026-10-26", items)).toEqual([]);
  });

  it("없거나 깨진 값은 체크 없음", () => {
    [undefined, null, "", [1, 2], { date: "2026-10-26" }, { date: "2026-10-26", done: "1,2" }, { done: [1] }].forEach(value => {
      expect(todayChecks(value, "2026-10-26", items)).toEqual([]);
    });
  });

  it("목록에 없는(삭제된) id와 중복은 무시", () => {
    expect(todayChecks({ date: "2026-10-26", done: [1, 9, 1, "2"] }, "2026-10-26", items)).toEqual([1]);
  });
});

describe("toggleCheck", () => {
  it("없으면 켜고, 있으면 끈다", () => {
    expect(toggleCheck([1], 2)).toEqual([1, 2]);
    expect(toggleCheck([1, 2], 1)).toEqual([2]);
    expect(toggleCheck([2], 2)).toEqual([]);
  });

  it("원본 목록을 바꾸지 않는다", () => {
    const done = [1];
    toggleCheck(done, 2);
    toggleCheck(done, 1);
    expect(done).toEqual([1]);
  });
});

describe("routineProgress", () => {
  it("완료 수, 전체 수, 모두 완료 여부", () => {
    expect(routineProgress(items, [1, 3])).toEqual({ done: 2, total: 3, complete: false });
    expect(routineProgress(items, [1, 2, 3])).toEqual({ done: 3, total: 3, complete: true });
    expect(routineProgress(items, [])).toEqual({ done: 0, total: 3, complete: false });
  });

  it("항목이 없으면 완료가 아니다", () => {
    expect(routineProgress([], [])).toEqual({ done: 0, total: 0, complete: false });
  });

  it("목록에 없는 id는 세지 않는다", () => {
    expect(routineProgress(items, [1, 9])).toEqual({ done: 1, total: 3, complete: false });
  });
});
