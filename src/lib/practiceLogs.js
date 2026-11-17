// 연습 기록 수정 (F-036). 순수 함수: 화면 상태는 App.jsx에서 다룬다.
import { MAX_TIMER_MINUTES } from "./timer";

export const EMPTY_NOTE = "연습 내용 미입력";

// 수정 칸에 채울 값. 메모가 "연습 내용 미입력"이면 빈 칸
export function logDraft(log) {
  return {
    songTitle: typeof log?.songTitle === "string" ? log.songTitle : "",
    minutes: String(log?.minutes ?? ""),
    note: log?.note === EMPTY_NOTE || typeof log?.note !== "string" ? "" : log.note,
  };
}

// 곡 선택에 보일 곡 이름 목록. 기록의 곡이 목록에서 지운 곡이면 그 이름도 남긴다 ("" = 자유 연습은 따로)
export function songChoices(songs, currentTitle) {
  const titles = (Array.isArray(songs) ? songs : []).map(song => song?.title).filter(t => typeof t === "string" && t);
  const unique = [...new Set(titles)];
  return currentTitle && !unique.includes(currentTitle) ? [currentTitle, ...unique] : unique;
}

// 연습 시간 칸 → 1~600 정수, 아니면 null
export function parseLogMinutes(text) {
  const value = String(text ?? "").trim();
  if (!/^\d+$/.test(value)) return null;
  const minutes = Number(value);
  return minutes >= 1 && minutes <= MAX_TIMER_MINUTES ? minutes : null;
}

// 고친 값을 기록 목록에 반영한다. id·날짜는 그대로.
// 결과: { logs, diff(누적 시간에 더할 분) }, 시간이 잘못됐거나 기록이 없으면 null
export function applyLogEdit(logs, id, draft) {
  const list = Array.isArray(logs) ? logs : [];
  const target = list.find(log => log.id === id);
  const minutes = parseLogMinutes(draft?.minutes);
  if (!target || minutes === null) return null;
  const edited = {
    ...target,
    songTitle: typeof draft.songTitle === "string" ? draft.songTitle : "",
    minutes,
    note: String(draft.note ?? "").trim() || EMPTY_NOTE,
  };
  return {
    logs: list.map(log => (log.id === id ? edited : log)),
    diff: minutes - (Number(target.minutes) || 0),
  };
}
