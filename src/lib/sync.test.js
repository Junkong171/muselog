import { describe, expect, it } from "vitest";
import { decideSync, formatSummary, hashData, isEmptyData, normalizeSyncMeta, stableStringify, summarizeData } from "./sync";
import { INITIAL_SONGS } from "./songs";

const sample = { "muselog-songs": INITIAL_SONGS, "muselog-logs": [], "muselog-events": [], "muselog-routine": [] };
const used = {
  "muselog-songs": [{ id: 10, title: "축하합니다" }],
  "muselog-logs": [{ id: 1, minutes: 30 }, { id: 2, minutes: 15 }],
};
const other = { "muselog-songs": [{ id: 20, title: "다른 곡" }], "muselog-logs": [{ id: 9, minutes: 5 }] };

const USER = "user-a";
const at = iso => ({ updatedAt: iso });

describe("stableStringify, hashData (기록 지문)", () => {
  it("키 순서가 달라도 같은 내용이면 같은 지문", () => {
    expect(stableStringify({ b: 1, a: [{ y: 2, x: 1 }] })).toBe(stableStringify({ a: [{ x: 1, y: 2 }], b: 1 }));
    expect(hashData({ b: 1, a: 2 })).toBe(hashData({ a: 2, b: 1 }));
  });

  it("내용이 다르면 다른 지문", () => {
    expect(hashData(used)).not.toBe(hashData(other));
    expect(hashData({ "muselog-goal": 60 })).not.toBe(hashData({ "muselog-goal": 61 }));
  });

  it("지문은 16자리 글자", () => {
    expect(hashData(used)).toMatch(/^[0-9a-f]{16}$/);
    expect(hashData(undefined)).toBe(hashData({}));
  });
});

describe("normalizeSyncMeta", () => {
  it("올바른 값은 그대로", () => {
    const meta = { userId: USER, syncedAt: "2026-10-31T01:00:00.000Z", hash: "abc" };
    expect(normalizeSyncMeta(meta)).toEqual(meta);
  });

  it("없거나 깨지면 맞춘 적 없음", () => {
    [undefined, null, "", 3, [], {}, { userId: 5 }, { userId: "" }].forEach(value => {
      expect(normalizeSyncMeta(value)).toEqual({ userId: null, syncedAt: null, hash: null });
    });
  });

  it("시각이나 지문만 깨졌으면 그 항목만 없음", () => {
    expect(normalizeSyncMeta({ userId: USER, syncedAt: "어제", hash: 3 })).toEqual({ userId: USER, syncedAt: null, hash: null });
  });
});

describe("isEmptyData, summarizeData", () => {
  it("아무것도 없거나 예시 곡 3개뿐이면 비어 있음", () => {
    expect(isEmptyData({})).toBe(true);
    expect(isEmptyData(undefined)).toBe(true);
    expect(isEmptyData(sample)).toBe(true);
    expect(isEmptyData({ "muselog-songs": [] })).toBe(true);
  });

  it("기록·일정·루틴이 하나라도 있거나 곡이 다르면 비어 있지 않음", () => {
    expect(isEmptyData(used)).toBe(false);
    expect(isEmptyData({ ...sample, "muselog-events": [{ id: 1 }] })).toBe(false);
    expect(isEmptyData({ ...sample, "muselog-routine": [{ id: 1, title: "스케일" }] })).toBe(false);
    expect(isEmptyData({ ...sample, "muselog-periods": [{ id: 1, title: "스케일" }] })).toBe(false);
    expect(isEmptyData({ ...sample, "muselog-ideas": [{ id: 1, text: "새벽의 편의점" }] })).toBe(false);
    expect(isEmptyData({ "muselog-songs": [...INITIAL_SONGS, { id: 4, title: "새 곡" }] })).toBe(false);
    expect(isEmptyData({ "muselog-songs": [{ id: 1, title: "바꾼 제목" }, INITIAL_SONGS[1], INITIAL_SONGS[2]] })).toBe(false);
  });

  it("개수 요약", () => {
    expect(summarizeData(used)).toEqual({ logs: 2, songs: 1, periods: 0, ideas: 0 });
    expect(summarizeData({})).toEqual({ logs: 0, songs: 0, periods: 0, ideas: 0 });
    const summary = summarizeData({ ...used, "muselog-periods": [{ id: 1 }], "muselog-ideas": [{ id: 1 }, { id: 2 }] });
    expect(formatSummary(summary)).toBe("연습 기록 2개 · 연습곡 1곡 · 연습 기간 1개 · 아이디어 2개");
  });
});

describe("decideSync — 처음 로그인 (이 계정과 맞춘 적 없음)", () => {
  const fresh = normalizeSyncMeta(null);

  it("계정이 비어 있으면 올린다", () => {
    expect(decideSync({ cloud: null, meta: fresh, userId: USER, localData: used })).toBe("upload");
    expect(decideSync({ cloud: null, meta: fresh, userId: USER, localData: sample })).toBe("upload");
  });

  it("이 기기가 비어 있으면 계정 기록을 불러온다", () => {
    expect(decideSync({ cloud: { ...at("2026-10-31T00:00:00Z"), data: used }, meta: fresh, userId: USER, localData: sample })).toBe("download");
  });

  it("둘 다 기록이 있으면 묻는다", () => {
    expect(decideSync({ cloud: { ...at("2026-10-31T00:00:00Z"), data: other }, meta: fresh, userId: USER, localData: used })).toBe("ask");
  });

  it("둘이 똑같으면 할 일 없음", () => {
    expect(decideSync({ cloud: { ...at("2026-10-31T00:00:00Z"), data: { ...used } }, meta: fresh, userId: USER, localData: used })).toBe("none");
  });

  it("다른 계정과 맞춰져 있던 브라우저도 처음 로그인처럼 판단", () => {
    const metaB = { userId: "user-b", syncedAt: "2026-10-31T09:00:00Z", hash: hashData(used) };
    expect(decideSync({ cloud: { ...at("2026-10-30T00:00:00Z"), data: other }, meta: metaB, userId: USER, localData: used })).toBe("ask");
    expect(decideSync({ cloud: null, meta: metaB, userId: USER, localData: used })).toBe("upload");
  });
});

describe("decideSync — 연습 기간 메모만 있는 브라우저", () => {
  it("처음 로그인해도 덮어쓰지 않고 묻는다", () => {
    const localData = { ...sample, "muselog-periods": [{ id: 1, start: "2026-03-01", end: "2026-05-31", title: "스케일", memo: "" }] };
    expect(decideSync({ cloud: { ...at("2026-10-31T00:00:00Z"), data: used }, meta: normalizeSyncMeta(null), userId: USER, localData })).toBe("ask");
  });
});

describe("decideSync — 아이디어만 있는 브라우저", () => {
  it("처음 로그인해도 덮어쓰지 않고 묻는다", () => {
    const localData = { ...sample, "muselog-ideas": [{ id: 1, text: "새벽의 편의점" }] };
    expect(decideSync({ cloud: { ...at("2026-10-31T00:00:00Z"), data: used }, meta: normalizeSyncMeta(null), userId: USER, localData })).toBe("ask");
  });
});

describe("decideSync — 이미 맞춰진 브라우저", () => {
  const synced = { userId: USER, syncedAt: "2026-10-31T01:00:00.000Z", hash: hashData(used) };

  it("계정이 새것이고 이 기기는 그대로면 불러온다 (다른 기기에서 쓴 기록)", () => {
    expect(decideSync({ cloud: { ...at("2026-10-31T02:00:00Z"), data: other }, meta: synced, userId: USER, localData: used })).toBe("download");
  });

  it("계정도 새것이고 이 기기도 바뀌었으면 묻는다", () => {
    const changed = { ...used, "muselog-goal": 90 };
    expect(decideSync({ cloud: { ...at("2026-10-31T02:00:00Z"), data: other }, meta: synced, userId: USER, localData: changed })).toBe("ask");
  });

  it("계정은 그대로고 이 기기만 바뀌었으면 올린다 (저장 실패, 로그아웃 중 수정, 백업 불러오기)", () => {
    const changed = { ...used, "muselog-goal": 90 };
    expect(decideSync({ cloud: { ...at("2026-10-31T01:00:00Z"), data: used }, meta: synced, userId: USER, localData: changed })).toBe("upload");
  });

  it("둘 다 그대로면 할 일 없음", () => {
    expect(decideSync({ cloud: { ...at("2026-10-31T01:00:00Z"), data: used }, meta: synced, userId: USER, localData: used })).toBe("none");
  });

  it("계정 기록이 지워졌으면 다시 올린다", () => {
    expect(decideSync({ cloud: null, meta: synced, userId: USER, localData: used })).toBe("upload");
  });

  it("맞춘 시각이 깨졌으면 계정을 새것으로 본다", () => {
    const noTime = { ...synced, syncedAt: null };
    expect(decideSync({ cloud: { ...at("2026-10-31T00:00:00Z"), data: other }, meta: noTime, userId: USER, localData: used })).toBe("download");
  });
});
