import { describe, expect, it } from "vitest";
import { applyLogEdit, EMPTY_NOTE, logDraft, parseLogMinutes, songChoices } from "./practiceLogs";

const logs = [
  { id: 1, date: "2026-11-17T10:00:00.000Z", minutes: 25, songTitle: "", note: EMPTY_NOTE },
  { id: 2, date: "2026-11-16T10:00:00.000Z", minutes: 30, songTitle: "밤편지", note: "고음" },
];

describe("logDraft (수정 칸 채우기)", () => {
  it("지금 값을 채우고, 미입력 메모는 빈 칸", () => {
    expect(logDraft(logs[0])).toEqual({ songTitle: "", minutes: "25", note: "" });
    expect(logDraft(logs[1])).toEqual({ songTitle: "밤편지", minutes: "30", note: "고음" });
  });
});

describe("songChoices (곡 선택 목록)", () => {
  const songs = [{ title: "밤편지" }, { title: "너를 생각해" }];

  it("연습곡 이름 목록", () => {
    expect(songChoices(songs, "")).toEqual(["밤편지", "너를 생각해"]);
    expect(songChoices(songs, "밤편지")).toEqual(["밤편지", "너를 생각해"]);
  });

  it("지운 곡이면 그 이름도 남긴다", () => {
    expect(songChoices(songs, "사라진 곡")).toEqual(["사라진 곡", "밤편지", "너를 생각해"]);
  });

  it("깨진 목록은 빈 목록", () => {
    expect(songChoices(undefined, "")).toEqual([]);
  });
});

describe("parseLogMinutes", () => {
  it("1~600 정수만", () => {
    expect(parseLogMinutes("1")).toBe(1);
    expect(parseLogMinutes(" 40 ")).toBe(40);
    expect(parseLogMinutes("600")).toBe(600);
    ["", "0", "601", "1.5", "-3", "abc", null, undefined].forEach(v => expect(parseLogMinutes(v)).toBeNull());
  });
});

describe("applyLogEdit (기록 고치기)", () => {
  it("곡·시간·메모만 바꾸고 id·날짜·개수는 그대로, 누적 차이를 돌려준다", () => {
    const result = applyLogEdit(logs, 1, { songTitle: "밤편지", minutes: "40", note: " 브릿지 " });
    expect(result.diff).toBe(15);
    expect(result.logs).toHaveLength(2);
    expect(result.logs[0]).toEqual({ id: 1, date: logs[0].date, minutes: 40, songTitle: "밤편지", note: "브릿지" });
    expect(result.logs[1]).toBe(logs[1]);
  });

  it("시간을 줄이면 음수 차이, 메모를 비우면 미입력", () => {
    const result = applyLogEdit(logs, 2, { songTitle: "", minutes: "10", note: "  " });
    expect(result.diff).toBe(-20);
    expect(result.logs[1]).toMatchObject({ songTitle: "", minutes: 10, note: EMPTY_NOTE });
  });

  it("시간이 잘못됐거나 기록이 없으면 null, 원본은 그대로", () => {
    const copy = JSON.parse(JSON.stringify(logs));
    expect(applyLogEdit(logs, 1, { songTitle: "", minutes: "0", note: "" })).toBeNull();
    expect(applyLogEdit(logs, 1, { songTitle: "", minutes: "601", note: "" })).toBeNull();
    expect(applyLogEdit(logs, 99, { songTitle: "", minutes: "10", note: "" })).toBeNull();
    expect(logs).toEqual(copy);
  });
});
