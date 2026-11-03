import { describe, expect, it } from "vitest";
import {
  formatClock,
  normalizeTimer,
  parseTimerMinutes,
  readTimer,
  restTimer,
  resumeTimer,
  startTimer,
  timerMinutes,
} from "./timer";

describe("타이머 흐름", () => {
  it("시작하면 연습 시간만 올라간다", () => {
    expect(readTimer(startTimer(1000), 6000)).toEqual({ practiceMs: 5000, restMs: 0 });
  });

  it("휴식 중에는 휴식 시간만 올라가고, 다시 시작하면 이어진다", () => {
    const resting = restTimer(startTimer(0), 10000);
    expect(readTimer(resting, 13000)).toEqual({ practiceMs: 10000, restMs: 3000 });
    const running = resumeTimer(resting, 15000);
    expect(readTimer(running, 17000)).toEqual({ practiceMs: 12000, restMs: 5000 });
  });

  it("휴식을 여러 번 해도 연습 시간에 더해지지 않는다", () => {
    let timer = startTimer(0);
    timer = restTimer(timer, 1000);
    timer = resumeTimer(timer, 2000);
    timer = restTimer(timer, 3000);
    timer = resumeTimer(timer, 5000);
    expect(readTimer(timer, 6000)).toEqual({ practiceMs: 3000, restMs: 3000 });
  });

  it("이미 그 상태면 그대로 둔다", () => {
    const timer = startTimer(0);
    expect(resumeTimer(timer, 5000)).toBe(timer);
    const resting = restTimer(timer, 5000);
    expect(restTimer(resting, 9000)).toBe(resting);
  });

  it("시계가 거꾸로 가도 음수가 되지 않는다", () => {
    const timer = { status: "running", since: 5000, practiceMs: 2000, restMs: 0 };
    expect(readTimer(timer, 1000)).toEqual({ practiceMs: 2000, restMs: 0 });
  });
});

describe("normalizeTimer (저장된 값 읽기)", () => {
  it("올바른 값은 그대로", () => {
    const saved = { status: "resting", since: 10, practiceMs: 20, restMs: 30 };
    expect(normalizeTimer(saved)).toEqual(saved);
  });

  it("깨진 값은 null", () => {
    [
      null,
      undefined,
      "x",
      3,
      {},
      { status: "paused", since: 1, practiceMs: 0, restMs: 0 },
      { status: "running", since: "1", practiceMs: 0, restMs: 0 },
      { status: "running", since: 1, practiceMs: -1, restMs: 0 },
      { status: "running", since: 1, practiceMs: 0 },
    ].forEach(raw => expect(normalizeTimer(raw)).toBeNull());
  });
});

describe("분과 시계 글자", () => {
  it("1분보다 짧으면 1분, 그 밖에는 반올림", () => {
    expect(timerMinutes(0)).toBe(1);
    expect(timerMinutes(59000)).toBe(1);
    expect(timerMinutes(60000)).toBe(1);
    expect(timerMinutes(89000)).toBe(1);
    expect(timerMinutes(90000)).toBe(2);
    expect(timerMinutes(3600000)).toBe(60);
  });

  it("입력한 분은 1~600 정수만 받는다", () => {
    expect(parseTimerMinutes("1")).toBe(1);
    expect(parseTimerMinutes(" 600 ")).toBe(600);
    ["0", "601", "1.5", "", "  ", "abc", "-3"].forEach(text => expect(parseTimerMinutes(text)).toBeNull());
  });

  it("시:분:초로 보여 준다", () => {
    expect(formatClock(0)).toBe("00:00:00");
    expect(formatClock(754999)).toBe("00:12:34");
    expect(formatClock(3661000)).toBe("01:01:01");
    expect(formatClock(-5)).toBe("00:00:00");
  });
});
