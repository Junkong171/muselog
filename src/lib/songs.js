// 연습곡 목록 정렬 (순수 함수). 원본 배열은 바꾸지 않고 새 배열을 돌려준다.

export const SONG_SORT_OPTIONS = [
  { key: "added", label: "추가한 순" },
  { key: "title", label: "제목순" },
  { key: "progress", label: "진행률순" },
];

// 처음 쓰는 사람에게 깔아 두는 예시 곡 (계정 동기화에서 "비어 있음" 판단에도 쓴다)
export const INITIAL_SONGS = [
  { id: 1, title: "밤편지", artist: "아이유", type: "보컬", progress: 75 },
  { id: 2, title: "너를 생각해", artist: "주시크", type: "기타", progress: 45 },
];

// 예전(F-034 전)에 깔리던 예시 곡 3개. 저장된 곡이 이것 그대로면 동기화에서 "비어 있음"으로 본다
export const OLD_INITIAL_SONGS = [
  ...INITIAL_SONGS,
  { id: 3, title: "사랑은 늘 도망가", artist: "임영웅", type: "보컬", progress: 30 },
];

// 표지 그림(♫ ♪ ♬ ♩ 네 가지)을 곡의 id로 정한다: 다른 곡을 지우거나 정렬해도 각 곡의 그림이 그대로다.
// 예시 곡(id 1, 2, 3)은 예전처럼 0, 1, 2번 그림이 나온다
export function songCoverIndex(id) {
  const n = typeof id === "number" ? Math.trunc(id) : NaN;
  return Number.isFinite(n) ? Math.abs(n - 1) % 4 : 0;
}

export const MAX_PURPOSE_LENGTH = 30;
export const PURPOSE_SUGGESTIONS = ["공연", "축가", "레슨 과제", "오디션", "취미"];

// 파트(세부 전공). 곡의 type 항목에 저장한다. "기타"는 기타 악기, 나머지는 "그 외"
export const PART_OPTIONS = ["보컬", "기타", "피아노", "베이스", "드럼", "작곡", "그 외"];
export const DEFAULT_PART = "보컬";

function normalizePurpose(value) {
  return typeof value === "string" ? value.trim().slice(0, MAX_PURPOSE_LENGTH) : "";
}

// 없거나 빈 값은 보컬, 목록에 없는 문자열은 "그 외"
function normalizePart(value) {
  if (typeof value !== "string" || !value.trim()) return DEFAULT_PART;
  return PART_OPTIONS.includes(value) ? value : "그 외";
}

// 저장된 연습곡(muselog-songs) 읽기. 목적(purpose)이 없거나 깨진 예전 곡은 ""(목적 없음)으로,
// 파트(type)는 위 규칙대로 채우고 다른 항목은 그대로 둔다. 배열이 아니면 빈 목록, 객체가 아닌 항목은 버린다.
export function normalizeSongs(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(song => song && typeof song === "object")
    .map(song => ({ ...song, type: normalizePart(song.type), purpose: normalizePurpose(song.purpose) }));
}

// 저장된 정렬 기준(muselog-song-sort)이 없거나 깨져 있으면 "added"(추가한 순)
export function normalizeSongSort(value) {
  return SONG_SORT_OPTIONS.some(option => option.key === value) ? value : "added";
}

function compareTitle(a, b) {
  return String(a.title).localeCompare(String(b.title), "ko", { sensitivity: "base" });
}

// "added": 저장 순서 / "title": 가나다순 / "progress": 높은 순, 같으면 제목순
// 모르는 기준이면 저장 순서. 비교가 같으면 저장 순서를 지킨다(안정 정렬).
export function sortSongs(songs, sortKey) {
  const list = [...songs];
  if (sortKey === "title") return list.sort(compareTitle);
  if (sortKey === "progress") {
    return list.sort((a, b) => (Number(b.progress) || 0) - (Number(a.progress) || 0) || compareTitle(a, b));
  }
  return list;
}
