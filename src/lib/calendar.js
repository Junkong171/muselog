// 캘린더 / D-DAY 계산 (순수 함수). "오늘"은 항상 인자로 받는다.
// 일정 날짜는 "YYYY-MM-DD" 문자열로 다룬다. new Date("YYYY-MM-DD")는 UTC로 읽혀
// 날짜가 하루 밀릴 수 있으므로 parseDateKey로 로컬 날짜를 만든다.

import { dateKey } from "./stats";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDateKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// 달력 칸: 첫 주 앞의 빈칸은 null, 날짜 칸은 { key, day }
export function getMonthGrid(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ key: dateKey(new Date(year, month, day)), day });
  }
  return cells;
}

// 오늘에서 일정 날짜까지 남은 날 수 (지났으면 음수)
export function calcDday(key, today) {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  return Math.round((parseDateKey(key) - start) / DAY_MS);
}

export function formatDday(diff) {
  if (diff === 0) return "D-DAY";
  return diff > 0 ? `D-${diff}` : `D+${-diff}`;
}

export function formatDateLabel(key) {
  const d = parseDateKey(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

// 저장된 값이 깨져 있어도 앱이 멈추지 않도록 올바른 일정만 남긴다.
export function normalizeEvents(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(e => e && typeof e.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.title)
    .map(e => ({ id: e.id ?? `${e.date}-${e.title}`, date: e.date, title: String(e.title), memo: e.memo ? String(e.memo) : "" }));
}

// 오늘 포함 앞으로의 일정, 가까운 날짜 순 (같은 날은 저장 순서)
export function upcomingEvents(events, today, limit = 5) {
  const todayKey = dateKey(today);
  return events
    .map((e, index) => ({ e, index }))
    .filter(({ e }) => e.date >= todayKey)
    .sort((a, b) => a.e.date.localeCompare(b.e.date) || a.index - b.index)
    .slice(0, limit)
    .map(({ e }) => e);
}
