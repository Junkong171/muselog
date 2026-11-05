import { describe, expect, it } from "vitest";
import { calcStreak, dateKey, getWeekDays, rankSongs, streakMessage, sumMinutesByDay } from "./stats";

// 로컬 날짜로 만든 기록. 저장 형식과 같게 date는 ISO 문자열로 넣는다.
function log(year, month, day, minutes, songTitle = "") {
  return {
    id: `${year}-${month}-${day}-${minutes}-${songTitle}`,
    date: new Date(year, month - 1, day, 12).toISOString(),
    minutes,
    songTitle,
    note: "",
  };
}

function local(year, month, day, hour = 12) {
  return new Date(year, month - 1, day, hour);
}

describe("기록이 하나도 없을 때", () => {
  const today = local(2026, 10, 23);

  it("모든 통계가 비어 있거나 0이다", () => {
    const byDay = sumMinutesByDay([]);
    expect(byDay).toEqual({});
    expect(calcStreak(byDay, today)).toBe(0);
    const week = getWeekDays(byDay, today);
    expect(week).toHaveLength(7);
    expect(week.every(day => day.minutes === 0)).toBe(true);
    expect(rankSongs([])).toEqual([]);
  });
});

describe("dateKey / sumMinutesByDay", () => {
  it("한 자리 월과 일을 0으로 채운다", () => {
    expect(dateKey(local(2026, 3, 5))).toBe("2026-03-05");
  });

  it("같은 날 기록은 합쳐진다", () => {
    const byDay = sumMinutesByDay([log(2026, 10, 23, 15), log(2026, 10, 23, 30), log(2026, 10, 22, 5)]);
    expect(byDay).toEqual({ "2026-10-23": 45, "2026-10-22": 5 });
  });
});

describe("streakMessage", () => {
  it("오늘 연습했으면 완료 문구를 보여 준다", () => {
    expect(streakMessage(5, true)).toBe("5일째 연습 중이에요. 오늘 연습 완료!");
  });

  it("오늘은 아직이고 어제까지 이어졌으면 다음 날짜를 보여 준다", () => {
    expect(streakMessage(5, false)).toBe("5일째 이어 가는 중이에요. 오늘 연습하면 6일째!");
  });

  it("연속 기록이 없으면 시작 문구를 보여 준다", () => {
    expect(streakMessage(0, false)).toBe("오늘 연습하면 1일째가 시작돼요.");
  });

  it("calcStreak 결과와 이어서 쓰면 상황에 맞는 문구가 나온다", () => {
    const today = local(2026, 10, 23);
    const yesterdayOnly = sumMinutesByDay([log(2026, 10, 22, 15)]);
    expect(streakMessage(calcStreak(yesterdayOnly, today), false)).toBe("1일째 이어 가는 중이에요. 오늘 연습하면 2일째!");
    const withToday = sumMinutesByDay([log(2026, 10, 23, 1), log(2026, 10, 22, 15)]);
    expect(streakMessage(calcStreak(withToday, today), true)).toBe("2일째 연습 중이에요. 오늘 연습 완료!");
    expect(streakMessage(calcStreak({}, today), false)).toBe("오늘 연습하면 1일째가 시작돼요.");
  });
});

describe("calcStreak", () => {
  it("오늘 기록이 없으면 어제부터 센다", () => {
    const byDay = sumMinutesByDay([log(2026, 10, 22, 15), log(2026, 10, 21, 15)]);
    expect(calcStreak(byDay, local(2026, 10, 23))).toBe(2);
  });

  it("하루 건너뛰면 연속이 끊긴다", () => {
    const byDay = sumMinutesByDay([log(2026, 10, 23, 15), log(2026, 10, 22, 15), log(2026, 10, 20, 15)]);
    expect(calcStreak(byDay, local(2026, 10, 23))).toBe(2);
  });

  it("월말에서 월초로 이어진다", () => {
    const byDay = sumMinutesByDay([log(2026, 10, 30, 15), log(2026, 10, 31, 15), log(2026, 11, 1, 15)]);
    expect(calcStreak(byDay, local(2026, 11, 1))).toBe(3);
  });
});

describe("getWeekDays", () => {
  it("일요일이면 그 주 월요일부터 오늘까지다", () => {
    const byDay = sumMinutesByDay([log(2026, 10, 19, 10), log(2026, 10, 25, 20)]);
    const week = getWeekDays(byDay, local(2026, 10, 25));
    expect(week.map(day => day.key)).toEqual([
      "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22",
      "2026-10-23", "2026-10-24", "2026-10-25",
    ]);
    expect(week.map(day => day.label)).toEqual(["월", "화", "수", "목", "금", "토", "일"]);
    expect(week[0].minutes).toBe(10);
    expect(week[6]).toMatchObject({ minutes: 20, isToday: true });
    expect(week.filter(day => day.isToday)).toHaveLength(1);
  });

  it("월요일이면 새 주가 시작되고 전날 일요일 기록은 빠진다", () => {
    const byDay = sumMinutesByDay([log(2026, 10, 25, 20)]);
    const week = getWeekDays(byDay, local(2026, 10, 26, 0));
    expect(week[0]).toMatchObject({ key: "2026-10-26", isToday: true });
    expect(week[6].key).toBe("2026-11-01");
    expect(week.every(day => day.minutes === 0)).toBe(true);
  });

  it("월말과 월초에 걸친 주를 만든다", () => {
    const byDay = sumMinutesByDay([log(2026, 10, 31, 15), log(2026, 11, 1, 25)]);
    const week = getWeekDays(byDay, local(2026, 11, 1, 23));
    expect(week.map(day => day.key)).toEqual([
      "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29",
      "2026-10-30", "2026-10-31", "2026-11-01",
    ]);
    expect(week[5].minutes).toBe(15);
    expect(week[6]).toMatchObject({ minutes: 25, isToday: true });
  });
});

describe("rankSongs", () => {
  it("곡 이름이 없는 기록은 '자유 연습'으로 묶이고 시간 순으로 정렬된다", () => {
    const logs = [
      log(2026, 10, 23, 10, "밤편지"),
      log(2026, 10, 23, 15, ""),
      { ...log(2026, 10, 22, 20), songTitle: undefined },
      log(2026, 10, 21, 5, "밤편지"),
    ];
    expect(rankSongs(logs)).toEqual([
      { name: "자유 연습", total: 35 },
      { name: "밤편지", total: 15 },
    ]);
  });
});
