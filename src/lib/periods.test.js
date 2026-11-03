import { describe, expect, it } from "vitest";
import {
  formatPeriodRange,
  MAX_PERIOD_MEMO_LENGTH,
  MAX_PERIOD_TITLE_LENGTH,
  normalizePeriods,
  periodDays,
  periodsOnDate,
  sortPeriods,
} from "./periods";

const period = (start, end, title = "기타 코드 전환", id = `${start}-${title}`) => ({ id, start, end, title, memo: "" });

describe("normalizePeriods (저장된 값 정리)", () => {
  it("배열이 아니면 빈 목록", () => {
    [null, undefined, "x", 3, {}].forEach(raw => {
      expect(normalizePeriods(raw)).toEqual([]);
    });
  });

  it("올바른 기간은 그대로 읽는다", () => {
    const saved = { id: 1, start: "2026-03-01", end: "2026-05-31", title: "스케일", memo: "하루 30분" };
    expect(normalizePeriods([saved])).toEqual([saved]);
  });

  it("날짜 형식이 틀리거나 없는 날짜, 제목 없음은 버린다", () => {
    const broken = [
      null,
      { start: "2026-3-1", end: "2026-05-31", title: "a" },
      { start: "2026-02-31", end: "2026-03-01", title: "a" },
      { start: "2026-03-01", title: "a" },
      { start: "2026-03-01", end: "2026-03-02", title: "   " },
      { start: "2026-03-01", end: "2026-03-02", title: 7 },
    ];
    expect(normalizePeriods(broken)).toEqual([]);
  });

  it("시작일이 끝일보다 늦으면 바꿔서 읽는다", () => {
    const [p] = normalizePeriods([{ id: 1, start: "2026-05-31", end: "2026-03-01", title: "a" }]);
    expect(p).toMatchObject({ start: "2026-03-01", end: "2026-05-31" });
  });

  it("빠진 값을 채우고 긴 글자는 자른다", () => {
    const [p] = normalizePeriods([{
      start: "2026-03-01",
      end: "2026-03-01",
      title: "가".repeat(MAX_PERIOD_TITLE_LENGTH + 5),
      memo: "나".repeat(MAX_PERIOD_MEMO_LENGTH + 5),
    }]);
    expect(p.id).toBeTruthy();
    expect(p.title).toHaveLength(MAX_PERIOD_TITLE_LENGTH);
    expect(p.memo).toHaveLength(MAX_PERIOD_MEMO_LENGTH);
    expect(normalizePeriods([{ start: "2026-03-01", end: "2026-03-01", title: "a" }])[0].memo).toBe("");
  });
});

describe("sortPeriods (목록 순서)", () => {
  it("시작일이 늦은 순, 같으면 끝일이 늦은 순, 그다음 저장 순서", () => {
    const list = [
      period("2026-01-01", "2026-01-31", "a"),
      period("2026-03-01", "2026-03-05", "b"),
      period("2026-03-01", "2026-04-01", "c"),
      period("2026-03-01", "2026-04-01", "d"),
    ];
    expect(sortPeriods(list).map(p => p.title)).toEqual(["c", "d", "b", "a"]);
    expect(list[0].title).toBe("a"); // 원본은 그대로
  });
});

describe("periodsOnDate (이 날짜가 기간에 들어가나)", () => {
  const list = [period("2026-03-10", "2026-04-05", "늦게 시작"), period("2026-03-01", "2026-03-20", "먼저 시작")];

  it("시작일과 끝일도 포함한다", () => {
    expect(periodsOnDate(list, "2026-04-05").map(p => p.title)).toEqual(["늦게 시작"]);
    expect(periodsOnDate(list, "2026-03-01").map(p => p.title)).toEqual(["먼저 시작"]);
  });

  it("밖의 날짜는 빈 목록", () => {
    expect(periodsOnDate(list, "2026-02-28")).toEqual([]);
    expect(periodsOnDate(list, "2026-04-06")).toEqual([]);
  });

  it("겹치면 먼저 시작한 순이고 원본 순서는 그대로", () => {
    expect(periodsOnDate(list, "2026-03-15").map(p => p.title)).toEqual(["먼저 시작", "늦게 시작"]);
    expect(list[0].title).toBe("늦게 시작");
  });
});

describe("periodDays · formatPeriodRange (일수와 글자)", () => {
  it("시작일과 끝일을 모두 센다", () => {
    expect(periodDays(period("2026-03-01", "2026-03-01"))).toBe(1);
    expect(periodDays(period("2026-03-01", "2026-05-31"))).toBe(92);
    expect(periodDays(period("2024-02-28", "2024-03-01"))).toBe(3); // 윤년
  });

  it("보이는 글자", () => {
    expect(formatPeriodRange(period("2026-03-01", "2026-05-31"))).toBe("2026.3.1 ~ 2026.5.31 · 92일");
  });
});
