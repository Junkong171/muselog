// 연습곡 목록 정렬 (순수 함수). 원본 배열은 바꾸지 않고 새 배열을 돌려준다.

export const SONG_SORT_OPTIONS = [
  { key: "added", label: "추가한 순" },
  { key: "title", label: "제목순" },
  { key: "progress", label: "진행률순" },
];

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
