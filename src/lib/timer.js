// 연습 타이머 계산 (순수 함수). 시각은 항상 인자로 받는다.
// 값: { status("running"/"resting"), since(이번 구간 시작 시각), practiceMs, restMs }, 재고 있지 않으면 null

import { elapsedToMinutes } from "./metronome";

export const MAX_TIMER_MINUTES = 600;

const isTime = value => Number.isFinite(value) && value >= 0;

// 깨진 값은 null(처음 상태)로 읽는다
export function normalizeTimer(raw) {
  if (!raw || !["running", "resting"].includes(raw.status)) return null;
  if (!isTime(raw.since) || !isTime(raw.practiceMs) || !isTime(raw.restMs)) return null;
  return { status: raw.status, since: raw.since, practiceMs: raw.practiceMs, restMs: raw.restMs };
}

export function startTimer(now) {
  return { status: "running", since: now, practiceMs: 0, restMs: 0 };
}

// 지금까지 쌓인 시간. 시계가 거꾸로 가도 이번 구간을 0으로 친다
export function readTimer(timer, now) {
  const passed = Math.max(0, now - timer.since);
  return {
    practiceMs: timer.practiceMs + (timer.status === "running" ? passed : 0),
    restMs: timer.restMs + (timer.status === "resting" ? passed : 0),
  };
}

function switchTo(status, timer, now) {
  if (timer.status === status) return timer;
  return { status, since: now, ...readTimer(timer, now) };
}

export const restTimer = (timer, now) => switchTo("resting", timer, now);
export const resumeTimer = (timer, now) => switchTo("running", timer, now);

// 저장 칸에 채울 분. 1분보다 짧아도 1분으로 친다
export function timerMinutes(practiceMs) {
  return Math.max(1, elapsedToMinutes(practiceMs / 1000));
}

// 입력한 분이 1~600 정수면 그 숫자, 아니면 null
export function parseTimerMinutes(text) {
  const minutes = Number(text);
  return String(text).trim() && Number.isInteger(minutes) && minutes >= 1 && minutes <= MAX_TIMER_MINUTES ? minutes : null;
}

// 밀리초 → "00:12:34"
export function formatClock(ms) {
  const total = Math.floor(Math.max(0, ms) / 1000);
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60]
    .map(part => String(part).padStart(2, "0"))
    .join(":");
}
