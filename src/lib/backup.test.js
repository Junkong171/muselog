import { describe, expect, it } from "vitest";
import { BACKUP_KEYS, backupFileName, buildBackup, parseBackup, planRestore } from "./backup";

const now = new Date(2026, 9, 30, 14, 5);

// 깨진 글자를 그대로 저장하고 싶을 때 쓰는 표시
const broken = text => ({ brokenRaw: text });

// localStorage처럼 글자로 저장된 값 (값은 JSON 글자로 바꿔 저장, broken()은 그대로)
function storage(values) {
  const raw = Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, v && v.brokenRaw !== undefined ? v.brokenRaw : JSON.stringify(v)]),
  );
  return key => (key in raw ? raw[key] : null);
}

const sample = {
  "muselog-songs": [{ id: 1, title: "밤편지", artist: "아이유", type: "보컬", progress: 75, purpose: "" }],
  "muselog-minutes": 30,
  "muselog-goal": 60,
  "muselog-logs": [{ id: 9, date: "2026-10-30T05:00:00.000Z", minutes: 30, songTitle: "밤편지", note: "고음" }],
  "muselog-song-sort": "title",
};

describe("buildBackup", () => {
  it("15개 키가 정해져 있다 (탭 순서, 연습 기간, 아이디어, 기준음, 코드 전환 연습, 코드 분석 켜기·끄기 포함)", () => {
    expect(BACKUP_KEYS).toHaveLength(15);
    expect(BACKUP_KEYS).toContain("muselog-chord-analysis");
    expect(BACKUP_KEYS).toContain("muselog-chord-drill");
    expect(BACKUP_KEYS).toContain("muselog-ideas");
    expect(BACKUP_KEYS).toContain("muselog-periods");
    expect(BACKUP_KEYS).toContain("muselog-tab-order");
    expect(BACKUP_KEYS).toContain("muselog-drone");
    expect(BACKUP_KEYS.every(k => k.startsWith("muselog-"))).toBe(true);
  });

  it("앱 이름, 버전, 내보낸 시각, 저장된 키만 담는다", () => {
    const backup = buildBackup(storage(sample), now);
    expect(backup.app).toBe("muselog");
    expect(backup.version).toBe(1);
    expect(backup.exportedAt).toBe(now.toISOString());
    expect(backup.data).toEqual(sample);
  });

  it("정해진 키 밖의 값은 담지 않는다", () => {
    const backup = buildBackup(storage({ ...sample, "other-app": [1, 2], "muselog-unknown": 1 }), now);
    expect(Object.keys(backup.data).sort()).toEqual(Object.keys(sample).sort());
  });

  it("JSON으로 읽을 수 없는 값은 뺀다", () => {
    const backup = buildBackup(storage({ "muselog-goal": 60, "muselog-logs": broken("{깨짐") }), now);
    expect(backup.data).toEqual({ "muselog-goal": 60 });
  });

  it("파일 이름은 muselog-backup-오늘날짜.json", () => {
    expect(backupFileName(now)).toBe("muselog-backup-2026-10-30.json");
  });
});

describe("parseBackup", () => {
  it("내보낸 것을 다시 읽으면 같은 내용", () => {
    const backup = buildBackup(storage(sample), now);
    const result = parseBackup(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    expect(result.backup).toEqual(backup);
  });

  it("JSON이 아니면 백업 파일이 아님", () => {
    ["", "안녕", "{깨짐", "<html>"].forEach(text => {
      expect(parseBackup(text)).toEqual({ ok: false, error: "MUSELOG 백업 파일이 아니에요." });
    });
  });

  it("다른 앱 파일이거나 data가 객체가 아니면 백업 파일이 아님", () => {
    [
      { app: "other", version: 1, data: {} },
      { version: 1, data: {} },
      { app: "muselog", version: 1 },
      { app: "muselog", version: 1, data: [] },
      { app: "muselog", version: 1, data: "x" },
      [1, 2],
      null,
      3,
    ].forEach(value => {
      expect(parseBackup(JSON.stringify(value)).ok).toBe(false);
    });
  });

  it("더 새로운 버전 파일은 불러올 수 없음", () => {
    expect(parseBackup(JSON.stringify({ app: "muselog", version: 2, data: {} }))).toEqual({
      ok: false,
      error: "더 새로운 버전의 백업 파일이라 불러올 수 없어요.",
    });
  });
});

describe("planRestore", () => {
  it("백업에 있는 키는 쓰고, 없는 키는 지운다", () => {
    const backup = buildBackup(storage(sample), now);
    const { set, remove } = planRestore(backup);
    expect(Object.fromEntries(set)).toEqual(
      Object.fromEntries(Object.entries(sample).map(([k, v]) => [k, JSON.stringify(v)])),
    );
    expect(remove.sort()).toEqual(BACKUP_KEYS.filter(k => !(k in sample)).sort());
  });

  it("백업 data에 정해진 키 밖의 값이 있어도 무시한다", () => {
    const { set } = planRestore({ app: "muselog", version: 1, data: { "evil-key": 1, "muselog-goal": 90 } });
    expect(set).toEqual([["muselog-goal", "90"]]);
  });
});
