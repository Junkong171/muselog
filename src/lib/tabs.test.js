import { describe, expect, it } from "vitest";
import { DEFAULT_TABS, isDefaultTabOrder, moveTab, normalizeTabOrder, TAB_ICONS } from "./tabs";

describe("normalizeTabOrder (저장된 탭 순서 읽기)", () => {
  it("기본 순서는 8개 탭, 탭마다 아이콘이 있다", () => {
    expect(DEFAULT_TABS).toEqual(["대시보드", "내 연습곡", "연습 기록", "연습 통계", "캘린더", "작업실", "영감", "수첩"]);
    DEFAULT_TABS.forEach(tab => expect(TAB_ICONS[tab]).toBeTruthy());
  });

  it("올바른 순서는 그대로", () => {
    const order = ["작업실", "대시보드", "내 연습곡", "연습 기록", "연습 통계", "캘린더", "영감", "수첩"];
    expect(normalizeTabOrder(order)).toEqual(order);
  });

  it("없거나 배열이 아니면 기본 순서", () => {
    [undefined, null, "", "작업실", 3, {}].forEach(value => {
      expect(normalizeTabOrder(value)).toEqual(DEFAULT_TABS);
    });
  });

  it("모르는 이름·중복은 버리고 빠진 탭은 기본 순서대로 뒤에 붙인다", () => {
    expect(normalizeTabOrder(["캘린더", "없는 탭", "캘린더", 3, "작업실"])).toEqual([
      "캘린더",
      "작업실",
      "대시보드",
      "내 연습곡",
      "연습 기록",
      "연습 통계",
      "영감",
      "수첩",
    ]);
  });

  it("기본 순서인지 알아챈다", () => {
    expect(isDefaultTabOrder(DEFAULT_TABS)).toBe(true);
    expect(isDefaultTabOrder(normalizeTabOrder(["작업실"]))).toBe(false);
  });
});

describe("moveTab (끌어다 놓기)", () => {
  const order = ["A", "B", "C", "D"];

  it("뒤에 있던 탭을 맨 앞으로", () => {
    expect(moveTab(order, 3, 0)).toEqual(["D", "A", "B", "C"]);
  });

  it("앞에 있던 탭을 맨 뒤로", () => {
    expect(moveTab(order, 0, 4)).toEqual(["B", "C", "D", "A"]);
  });

  it("중간으로 옮기기 (앞으로·뒤로)", () => {
    expect(moveTab(order, 3, 1)).toEqual(["A", "D", "B", "C"]);
    expect(moveTab(order, 0, 2)).toEqual(["B", "A", "C", "D"]);
  });

  it("제자리에 놓으면 그대로", () => {
    expect(moveTab(order, 1, 1)).toEqual(order);
    expect(moveTab(order, 1, 2)).toEqual(order);
  });

  it("범위를 벗어난 값도 안전하게", () => {
    expect(moveTab(order, 9, 0)).toBe(order);
    expect(moveTab(order, 0, 99)).toEqual(["B", "C", "D", "A"]);
  });

  it("원본을 바꾸지 않는다", () => {
    const copy = [...order];
    moveTab(order, 0, 3);
    expect(order).toEqual(copy);
  });
});
