import { describe, expect, it } from "vitest";
import { normalizeSongSort, SONG_SORT_OPTIONS, sortSongs } from "./songs";

const songs = [
  { id: 1, title: "밤편지", progress: 75 },
  { id: 2, title: "너를 생각해", progress: 45 },
  { id: 3, title: "사랑은 늘 도망가", progress: 30 },
  { id: 4, title: "가을 아침", progress: 45 },
];

const titles = list => list.map(s => s.title);

describe("sortSongs", () => {
  it("정렬 기준은 추가한 순, 제목순, 진행률순 3가지", () => {
    expect(SONG_SORT_OPTIONS.map(o => o.label)).toEqual(["추가한 순", "제목순", "진행률순"]);
  });

  it("추가한 순은 저장 순서 그대로", () => {
    expect(titles(sortSongs(songs, "added"))).toEqual(["밤편지", "너를 생각해", "사랑은 늘 도망가", "가을 아침"]);
  });

  it("제목순은 가나다순, 영어는 대소문자 구분 없이 A→Z", () => {
    expect(titles(sortSongs(songs, "title"))).toEqual(["가을 아침", "너를 생각해", "밤편지", "사랑은 늘 도망가"]);
    const english = [{ title: "banana" }, { title: "Apple" }, { title: "cherry" }];
    expect(titles(sortSongs(english, "title"))).toEqual(["Apple", "banana", "cherry"]);
  });

  it("제목이 같으면 추가한 순서", () => {
    const same = [{ id: "a", title: "연습" }, { id: "b", title: "연습" }];
    expect(sortSongs(same, "title").map(s => s.id)).toEqual(["a", "b"]);
  });

  it("진행률순은 높은 순, 같으면 제목순", () => {
    expect(titles(sortSongs(songs, "progress"))).toEqual(["밤편지", "가을 아침", "너를 생각해", "사랑은 늘 도망가"]);
  });

  it("원본 배열을 바꾸지 않는다", () => {
    const before = titles(songs);
    sortSongs(songs, "title");
    sortSongs(songs, "progress");
    expect(titles(songs)).toEqual(before);
    expect(sortSongs(songs, "added")).not.toBe(songs);
  });

  it("모르는 기준이면 추가한 순", () => {
    expect(titles(sortSongs(songs, "모름"))).toEqual(titles(songs));
    expect(titles(sortSongs(songs, undefined))).toEqual(titles(songs));
  });
});

describe("normalizeSongSort (저장된 정렬 기준 읽기)", () => {
  it("올바른 기준은 그대로", () => {
    expect(normalizeSongSort("added")).toBe("added");
    expect(normalizeSongSort("title")).toBe("title");
    expect(normalizeSongSort("progress")).toBe("progress");
  });

  it("없거나 깨진 값은 추가한 순", () => {
    [undefined, null, "", "제목순", 1, {}, []].forEach(value => {
      expect(normalizeSongSort(value)).toBe("added");
    });
  });
});
