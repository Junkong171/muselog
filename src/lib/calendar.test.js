import { describe, expect, it } from "vitest";
import {
  calcDday,
  formatDateLabel,
  formatDday,
  getMonthGrid,
  normalizeEvents,
  upcomingEvents,
} from "./calendar";

function local(year, month, day, hour = 12) {
  return new Date(year, month - 1, day, hour);
}

function event(date, title, id = `${date}-${title}`) {
  return { id, date, title, memo: "" };
}

describe("getMonthGrid", () => {
  it("2026년 10월은 목요일(빈칸 4개)부터 시작하고 31일까지 있다", () => {
    const cells = getMonthGrid(2026, 9);
    expect(cells.slice(0, 4)).toEqual([null, null, null, null]);
    expect(cells[4]).toEqual({ key: "2026-10-01", day: 1 });
    expect(cells.filter(Boolean)).toHaveLength(31);
    expect(cells.at(-1)).toEqual({ key: "2026-10-31", day: 31 });
  });

  it("윤년 2월과 연도 넘김(다음 달 계산)을 처리한다", () => {
    expect(getMonthGrid(2028, 1).filter(Boolean)).toHaveLength(29);
    expect(getMonthGrid(2026, 12).find(Boolean).key).toBe("2027-01-01");
  });
});

describe("D-DAY 계산", () => {
  const today = local(2026, 10, 25, 23);

  it("오늘은 D-DAY, 미래는 D-n, 과거는 D+n", () => {
    expect(formatDday(calcDday("2026-10-25", today))).toBe("D-DAY");
    expect(formatDday(calcDday("2026-10-30", today))).toBe("D-5");
    expect(formatDday(calcDday("2026-10-20", today))).toBe("D+5");
  });

  it("연도를 넘어도 날짜 차이로 계산한다", () => {
    expect(calcDday("2027-01-01", today)).toBe(68);
  });
});

describe("formatDateLabel", () => {
  it("월 일 (요일) 형식", () => {
    expect(formatDateLabel("2026-10-30")).toBe("10월 30일 (금)");
  });
});

describe("normalizeEvents", () => {
  it("배열이 아니면 빈 배열", () => {
    expect(normalizeEvents(null)).toEqual([]);
    expect(normalizeEvents("깨진 값")).toEqual([]);
    expect(normalizeEvents({})).toEqual([]);
  });

  it("date나 title이 없는 항목은 건너뛰고 memo 기본값을 넣는다", () => {
    const result = normalizeEvents([
      { id: 1, date: "2026-10-30", title: "레슨" },
      { id: 2, title: "날짜 없음" },
      { id: 3, date: "2026-10-31" },
      null,
    ]);
    expect(result).toEqual([{ id: 1, date: "2026-10-30", title: "레슨", memo: "" }]);
  });
});

describe("upcomingEvents", () => {
  const today = local(2026, 10, 25);

  it("지난 일정은 빼고 가까운 순으로 최대 5개", () => {
    const events = [
      event("2026-11-10", "F"),
      event("2026-10-20", "지난 일정"),
      event("2026-10-30", "B"),
      event("2026-10-25", "A"),
      event("2026-11-01", "C"),
      event("2026-11-02", "D"),
      event("2026-11-03", "E"),
    ];
    expect(upcomingEvents(events, today).map(e => e.title)).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("같은 날은 먼저 저장한 일정이 앞에 온다", () => {
    const events = [event("2026-10-26", "먼저"), event("2026-10-26", "나중")];
    expect(upcomingEvents(events, today, 1)[0].title).toBe("먼저");
  });

  it("앞으로의 일정이 없으면 빈 배열", () => {
    expect(upcomingEvents([event("2026-10-01", "지남")], today)).toEqual([]);
  });
});
