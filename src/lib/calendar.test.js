import { describe, expect, it } from "vitest";
import {
  calcDday,
  combineTime,
  filterOptions,
  formatDateLabel,
  formatDday,
  formatEventTime,
  getMonthGrid,
  HOUR_OPTIONS,
  MINUTE_OPTIONS,
  normalizeEvents,
  sortEvents,
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
    expect(result).toEqual([{ id: 1, date: "2026-10-30", time: "", title: "레슨", memo: "" }]);
  });

  it("time이 없는 옛 일정은 종일(\"\")로 읽고 다른 필드는 그대로 둔다", () => {
    const old = [{ id: 7, date: "2026-10-30", title: "레슨", memo: "3번 곡" }];
    expect(normalizeEvents(old)).toEqual([
      { id: 7, date: "2026-10-30", time: "", title: "레슨", memo: "3번 곡" },
    ]);
  });

  it("HH:MM 형식이 아닌 time은 종일로 읽는다", () => {
    const times = ["14:00", "25:00", "25시", 1400, "9:00", "23:59"].map(time =>
      normalizeEvents([{ id: 1, date: "2026-10-30", time, title: "레슨" }])[0].time
    );
    expect(times).toEqual(["14:00", "", "", "", "", "23:59"]);
  });
});

describe("combineTime (시·분 합치기)", () => {
  it("시·분을 HH:MM으로 합친다 (분은 1분 단위 가능)", () => {
    expect(combineTime("9", "5")).toBe("09:05");
    expect(combineTime("14", "07")).toBe("14:07");
    expect(combineTime("0", "0")).toBe("00:00");
    expect(combineTime("23", "59")).toBe("23:59");
  });

  it("분을 비우면 정각, 둘 다 비우면 종일(\"\")", () => {
    expect(combineTime("14", "")).toBe("14:00");
    expect(combineTime("", "")).toBe("");
    expect(combineTime(" ", undefined)).toBe("");
  });

  it("시간이 아니면 null", () => {
    expect(combineTime("24", "00")).toBeNull();
    expect(combineTime("14", "60")).toBeNull();
    expect(combineTime("", "30")).toBeNull();
    expect(combineTime("1a", "00")).toBeNull();
    expect(combineTime("123", "00")).toBeNull();
  });
});

describe("filterOptions (칸별 목록 거르기)", () => {
  it("목록: 시 00~23 24개, 분 00~55 5분 단위 12개", () => {
    expect(HOUR_OPTIONS).toHaveLength(24);
    expect(HOUR_OPTIONS.at(-1)).toBe("23");
    expect(MINUTE_OPTIONS).toEqual(["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"]);
  });

  it("빈칸이면 전체", () => {
    expect(filterOptions(HOUR_OPTIONS, "")).toEqual(HOUR_OPTIONS);
  });

  it("친 숫자로 시작하는 값만 남긴다", () => {
    expect(filterOptions(HOUR_OPTIONS, "1")).toEqual(["01", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"]);
    expect(filterOptions(HOUR_OPTIONS, "9")).toEqual(["09"]);
    expect(filterOptions(MINUTE_OPTIONS, "3")).toEqual(["30", "35"]);
  });

  it("맞는 값이 없으면 빈 배열 (예: 1분 단위 직접 입력)", () => {
    expect(filterOptions(MINUTE_OPTIONS, "07")).toEqual([]);
    expect(filterOptions(HOUR_OPTIONS, "3")).toEqual(["03"]);
    expect(filterOptions(HOUR_OPTIONS, "25")).toEqual([]);
  });
});

describe("시간 표시와 정렬", () => {
  it("시간이 없으면 \"종일\"", () => {
    expect(formatEventTime("")).toBe("종일");
    expect(formatEventTime("14:00")).toBe("14:00");
  });

  it("같은 날은 종일 → 이른 시간 → 저장 순서", () => {
    const events = [
      { ...event("2026-10-30", "레슨"), time: "14:00" },
      { ...event("2026-10-30", "합주"), time: "10:00" },
      { ...event("2026-10-30", "종일"), time: "" },
      { ...event("2026-10-30", "레슨2"), time: "14:00" },
      { ...event("2026-10-29", "전날"), time: "20:00" },
    ];
    expect(sortEvents(events).map(e => e.title)).toEqual(["전날", "종일", "합주", "레슨", "레슨2"]);
  });

  it("다가오는 일정도 같은 순서", () => {
    const events = [
      { ...event("2026-10-26", "오후"), time: "15:00" },
      { ...event("2026-10-26", "오전"), time: "09:00" },
    ];
    expect(upcomingEvents(events, local(2026, 10, 25)).map(e => e.title)).toEqual(["오전", "오후"]);
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
