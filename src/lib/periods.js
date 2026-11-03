// 연습 기간 메모 (순수 함수). 날짜는 일정과 같은 "YYYY-MM-DD" 문자열이라 글자 비교가 곧 날짜 비교다.

import { dateKey } from "./stats";
import { parseDateKey } from "./calendar";

export const MAX_PERIOD_TITLE_LENGTH = 40;
export const MAX_PERIOD_MEMO_LENGTH = 200;

const DAY_MS = 24 * 60 * 60 * 1000;

// 형식만 맞고 없는 날짜(2월 31일 등)도 걸러 낸다
function isDateKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(parseDateKey(value)) === value;
}

// 저장된 값이 깨져 있어도 앱이 멈추지 않도록 올바른 기간만 남긴다. 시작일과 끝일이 뒤집혀 있으면 바꿔서 읽는다.
export function normalizePeriods(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(p => p && isDateKey(p.start) && isDateKey(p.end) && typeof p.title === "string" && p.title.trim())
    .map(p => {
      const [start, end] = p.start <= p.end ? [p.start, p.end] : [p.end, p.start];
      const title = p.title.trim().slice(0, MAX_PERIOD_TITLE_LENGTH);
      return {
        id: p.id ?? `${start}-${end}-${title}`,
        start,
        end,
        title,
        memo: typeof p.memo === "string" ? p.memo.trim().slice(0, MAX_PERIOD_MEMO_LENGTH) : "",
      };
    });
}

// 목록용: 시작일이 늦은 순, 같으면 끝일이 늦은 순 → 저장 순서
export function sortPeriods(periods) {
  return periods
    .map((p, index) => ({ p, index }))
    .sort((a, b) =>
      b.p.start.localeCompare(a.p.start) ||
      b.p.end.localeCompare(a.p.end) ||
      a.index - b.index)
    .map(({ p }) => p);
}

// 이 날짜가 들어가는 기간, 먼저 시작한 순 (달력 띠가 날마다 같은 자리에 오도록)
export function periodsOnDate(periods, key) {
  return periods
    .filter(p => p.start <= key && key <= p.end)
    .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
}

// 시작일과 끝일을 모두 세는 일수
export function periodDays(period) {
  return Math.round((parseDateKey(period.end) - parseDateKey(period.start)) / DAY_MS) + 1;
}

function shortDate(key) {
  const d = parseDateKey(key);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

// "2026.3.1 ~ 2026.5.31 · 92일"
export function formatPeriodRange(period) {
  return `${shortDate(period.start)} ~ ${shortDate(period.end)} · ${periodDays(period)}일`;
}
