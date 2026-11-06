import { describe, expect, it } from "vitest";
import {
  audioExtension,
  formatRecordingDate,
  MAX_PRACTICE_RECORDINGS,
  MAX_PRACTICE_SECONDS,
  recordingFileName,
  sortRecordings,
} from "./practiceRecordings";

// 이 기기 시각으로 만든 날짜 (시험하는 컴퓨터의 시간대와 상관없이 같게)
const local = (y, m, d, h, min) => new Date(y, m - 1, d, h, min).toISOString();

describe("연습 녹음", () => {
  it("10분, 20개까지", () => {
    expect(MAX_PRACTICE_SECONDS).toBe(600);
    expect(MAX_PRACTICE_RECORDINGS).toBe(20);
  });

  it("최근 녹음이 위로", () => {
    const list = [{ id: 1, createdAt: local(2026, 11, 6, 9, 0) }, { id: 2, createdAt: local(2026, 11, 7, 9, 0) }, { id: 3, createdAt: local(2026, 11, 6, 21, 0) }];
    expect(sortRecordings(list).map(item => item.id)).toEqual([2, 3, 1]);
    expect(list[0].id).toBe(1); // 원본은 그대로
  });

  it("날짜·시각 표시", () => {
    expect(formatRecordingDate(local(2026, 11, 7, 15, 5))).toBe("11월 7일 오후 3:05");
    expect(formatRecordingDate(local(2026, 1, 2, 0, 30))).toBe("1월 2일 오전 12:30");
    expect(formatRecordingDate(local(2026, 1, 2, 12, 0))).toBe("1월 2일 오후 12:00");
    expect(formatRecordingDate("x")).toBe("");
  });

  it("녹음 형식에 맞는 확장자", () => {
    expect(audioExtension("audio/webm;codecs=opus")).toBe("webm");
    expect(audioExtension("audio/mp4")).toBe("m4a");
    expect(audioExtension("audio/ogg; codecs=opus")).toBe("ogg");
    expect(audioExtension("")).toBe("webm");
  });

  it("파일 이름", () => {
    expect(recordingFileName(local(2026, 11, 7, 15, 5), "audio/webm")).toBe("muselog-녹음-2026-11-07-1505.webm");
    expect(recordingFileName(local(2026, 3, 1, 8, 9), "audio/mp4")).toBe("muselog-녹음-2026-03-01-0809.m4a");
  });
});
