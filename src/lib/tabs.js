// 사이드바 탭 순서 (순수 함수). 저장 키는 muselog-tab-order (탭 이름 배열)

export const DEFAULT_TABS = ["대시보드", "내 연습곡", "연습 기록", "연습 통계", "캘린더", "연습실", "작업실", "영감", "수첩"];

export const TAB_ICONS = {
  대시보드: "⌂",
  "내 연습곡": "♫",
  "연습 기록": "▤",
  "연습 통계": "◔",
  캘린더: "▦",
  연습실: "♩",
  작업실: "◈",
  영감: "✦",
  수첩: "✎",
};

// 나중에 새로 생긴 탭이 예전 저장 순서에서 들어갈 자리 (이 탭 바로 앞)
const NEW_TAB_BEFORE = { 연습실: "작업실" };

// 저장된 순서 읽기. 모르는 이름·중복은 버리고, 빠진 탭은 기본 순서대로 뒤에 붙인다.
// 단, NEW_TAB_BEFORE에 있는 새 탭은 정해 둔 탭이 저장 순서에 있으면 그 바로 앞에 끼운다
export function normalizeTabOrder(value) {
  const saved = Array.isArray(value) ? value : [];
  const order = [...new Set(saved.filter(tab => DEFAULT_TABS.includes(tab)))];
  DEFAULT_TABS.filter(tab => !order.includes(tab)).forEach(tab => {
    const at = order.indexOf(NEW_TAB_BEFORE[tab]);
    if (at === -1) order.push(tab);
    else order.splice(at, 0, tab);
  });
  return order;
}

export function isDefaultTabOrder(order) {
  return order.length === DEFAULT_TABS.length && order.every((tab, i) => tab === DEFAULT_TABS[i]);
}

// from번째 탭을 옮긴 새 목록. insertAt은 옮기기 전 목록에서 "이 자리 앞에 놓는다"는 위치(0 ~ 길이)
export function moveTab(order, from, insertAt) {
  if (from < 0 || from >= order.length) return order;
  const at = Math.max(0, Math.min(insertAt, order.length));
  const next = order.filter((_, i) => i !== from);
  next.splice(at > from ? at - 1 : at, 0, order[from]);
  return next;
}
