import { describe, expect, it } from "vitest";
import {
  MAX_PURPOSE_LENGTH,
  normalizeSongSort,
  normalizeSongs,
  PART_OPTIONS,
  SONG_SORT_OPTIONS,
  sortSongs,
} from "./songs";

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

describe("normalizeSongs (저장된 연습곡 읽기, 목적 마이그레이션)", () => {
  const old = [
    { id: 1, title: "밤편지", artist: "아이유", type: "보컬", progress: 75 },
    { id: 2, title: "너를 생각해", artist: "주시크", type: "기타", progress: 45 },
  ];

  it("목적이 없는 예전 곡은 목적 없음(\"\")으로 채우고 다른 항목은 그대로", () => {
    expect(normalizeSongs(old)).toEqual([
      { id: 1, title: "밤편지", artist: "아이유", type: "보컬", progress: 75, purpose: "" },
      { id: 2, title: "너를 생각해", artist: "주시크", type: "기타", progress: 45, purpose: "" },
    ]);
  });

  it("목적이 있으면 앞뒤 공백만 빼고 그대로", () => {
    expect(normalizeSongs([{ ...old[0], purpose: "  12월 공연 " }])[0].purpose).toBe("12월 공연");
  });

  it("목적이 문자열이 아니면 목적 없음", () => {
    [null, 3, true, ["축가"], { text: "축가" }].forEach(purpose => {
      expect(normalizeSongs([{ ...old[0], purpose }])[0].purpose).toBe("");
    });
  });

  it("목적이 30자보다 길면 30자까지", () => {
    const purpose = normalizeSongs([{ ...old[0], purpose: "가".repeat(40) }])[0].purpose;
    expect(purpose).toHaveLength(MAX_PURPOSE_LENGTH);
  });

  it("배열이 아니면 빈 목록, 객체가 아닌 항목은 버린다", () => {
    [undefined, null, "abc", 3, {}].forEach(value => {
      expect(normalizeSongs(value)).toEqual([]);
    });
    expect(normalizeSongs([null, "곡", old[0]]).map(s => s.id)).toEqual([1]);
  });

  it("파트 목록에 있는 값(예전 기본 곡의 보컬, 기타)은 그대로", () => {
    expect(PART_OPTIONS).toEqual(["보컬", "기타", "피아노", "베이스", "드럼", "작곡", "그 외"]);
    expect(normalizeSongs(old).map(s => s.type)).toEqual(["보컬", "기타"]);
    PART_OPTIONS.forEach(type => {
      expect(normalizeSongs([{ ...old[0], type }])[0].type).toBe(type);
    });
  });

  it("파트가 없거나 문자열이 아니거나 비었으면 보컬", () => {
    const { type: _omit, ...noType } = old[0];
    expect(normalizeSongs([noType])[0].type).toBe("보컬");
    [null, 3, "", "   ", ["기타"]].forEach(type => {
      expect(normalizeSongs([{ ...old[0], type }])[0].type).toBe("보컬");
    });
  });

  it("목록에 없는 파트 문자열은 그 외", () => {
    expect(normalizeSongs([{ ...old[0], type: "바이올린" }])[0].type).toBe("그 외");
  });

  it("원본을 바꾸지 않는다", () => {
    const copy = JSON.parse(JSON.stringify(old));
    normalizeSongs(old);
    expect(old).toEqual(copy);
    expect(old[0]).not.toHaveProperty("purpose");
  });
});
