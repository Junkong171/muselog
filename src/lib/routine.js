// 고정 연습 루틴 계산 (순수 함수). 화면은 Routine.jsx에서 그린다.

export const MAX_ROUTINE_TITLE = 40;

// 저장된 루틴 목록(muselog-routine)을 읽는다.
// 이름이 없거나 문자열이 아닌 항목, id가 숫자가 아니거나 겹치는 항목은 버린다
export function normalizeRoutine(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const items = [];
  value.forEach(item => {
    if (!item || typeof item !== "object") return;
    const title = typeof item.title === "string" ? item.title.trim().slice(0, MAX_ROUTINE_TITLE) : "";
    if (!title || !Number.isFinite(item.id) || seen.has(item.id)) return;
    seen.add(item.id);
    items.push({ id: item.id, title });
  });
  return items;
}

// 저장된 체크 상태(muselog-routine-checks)에서 오늘 체크한 id 목록만 꺼낸다.
// 날짜가 오늘이 아니거나 형식이 깨졌으면 체크 없음, 목록에 없는 id는 무시
export function todayChecks(value, todayKey, items) {
  if (!value || typeof value !== "object" || value.date !== todayKey || !Array.isArray(value.done)) return [];
  const ids = new Set(items.map(item => item.id));
  return [...new Set(value.done.filter(id => ids.has(id)))];
}

// id의 체크를 켜거나 끈 새 목록 (원본은 바꾸지 않음)
export function toggleCheck(done, id) {
  return done.includes(id) ? done.filter(d => d !== id) : [...done, id];
}

export function routineProgress(items, done) {
  const checked = items.filter(item => done.includes(item.id)).length;
  return { done: checked, total: items.length, complete: items.length > 0 && checked === items.length };
}
