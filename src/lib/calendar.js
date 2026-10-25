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

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// 저장된 값이 깨져 있어도 앱이 멈추지 않도록 올바른 일정만 남긴다.
// time이 없는 옛 일정(F-002)이나 형식이 틀린 time은 ""(종일)로 읽는다.
export function normalizeEvents(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(e => e && typeof e.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.title)
    .map(e => ({
      id: e.id ?? `${e.date}-${e.title}`,
      date: e.date,
      time: TIME_PATTERN.test(e.time) ? e.time : "",
      title: String(e.title),
      memo: e.memo ? String(e.memo) : "",
    }));
}

// 시간 입력 칸 아래 선택 목록: 시 00~23, 분 00~55 (5분 단위)
export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
export const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

// 친 숫자로 시작하는 값만 남긴다. 시 "1" → 01, 10~19 / 분 "3" → 30, 35
export function filterOptions(options, text) {
  const value = String(text ?? "").trim();
  if (!value) return options;
  return options.filter(option => option.startsWith(value) || option.replace(/^0/, "").startsWith(value));
}

// 시·분 칸을 저장 형식으로 합친다.
// ("9", "5") → "09:05", ("14", "") → "14:00", ("", "") → ""(종일), 시간이 아니면 null
export function combineTime(hourText, minuteText) {
  const hour = String(hourText ?? "").trim();
  const minute = String(minuteText ?? "").trim();
  if (!hour && !minute) return "";
  if (!/^\d{1,2}$/.test(hour) || (minute && !/^\d{1,2}$/.test(minute))) return null;
  const h = Number(hour);
  const m = minute ? Number(minute) : 0;
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatEventTime(time) {
  return time || "종일";
}

// 날짜순, 같은 날은 종일 → 이른 시간 → 저장 순서
export function sortEvents(events) {
  return events
    .map((e, index) => ({ e, index }))
    .sort((a, b) =>
      a.e.date.localeCompare(b.e.date) ||
      (a.e.time || "").localeCompare(b.e.time || "") ||
      a.index - b.index)
    .map(({ e }) => e);
}

// 오늘 포함 앞으로의 일정, 가까운 순
export function upcomingEvents(events, today, limit = 5) {
  const todayKey = dateKey(today);
  return sortEvents(events.filter(e => e.date >= todayKey)).slice(0, limit);
}
