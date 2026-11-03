// 계정 동기화 판단 (순수 함수). 실제 서버 읽기·쓰기는 App.jsx에서 supabase로 한다.
// "data"는 백업 묶음 안쪽의 { 9개 키: 값 } 객체다 (buildBackup(...).data).
import { INITIAL_SONGS } from "./songs";

export const SYNC_META_KEY = "muselog-sync-meta";

// 키 순서와 상관없이 같은 내용이면 같은 글자가 되게 만든다 (서버 jsonb는 키 순서를 바꿔 저장한다)
export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const keys = Object.keys(value).filter(k => value[k] !== undefined).sort();
    return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

// 기록 묶음의 지문 (짧은 글자). 내용이 같으면 같고, 조금이라도 다르면 거의 항상 달라진다
export function hashData(data) {
  const text = stableStringify(data ?? {});
  let h1 = 0x811c9dc5;
  let h2 = 5381;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = (Math.imul(h2, 33) + c) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

// 저장된 맞춤 정보 읽기. 깨졌으면 "맞춘 적 없음"
export function normalizeSyncMeta(value) {
  const empty = { userId: null, syncedAt: null, hash: null };
  if (!value || typeof value !== "object" || Array.isArray(value)) return empty;
  const ok = v => typeof v === "string" && v !== "";
  if (!ok(value.userId)) return empty;
  return {
    userId: value.userId,
    syncedAt: ok(value.syncedAt) && !Number.isNaN(Date.parse(value.syncedAt)) ? value.syncedAt : null,
    hash: ok(value.hash) ? value.hash : null,
  };
}

const list = value => (Array.isArray(value) ? value : []);

// 비어 있음: 연습 기록·일정·연습 기간·루틴이 하나도 없고, 연습곡이 없거나 처음 깔리는 예시 곡 3개 그대로
export function isEmptyData(data) {
  const d = data ?? {};
  if (list(d["muselog-logs"]).length || list(d["muselog-events"]).length || list(d["muselog-periods"]).length || list(d["muselog-routine"]).length) {
    return false;
  }
  const songs = list(d["muselog-songs"]);
  if (songs.length === 0) return true;
  return (
    songs.length === INITIAL_SONGS.length &&
    songs.every((song, i) => song?.id === INITIAL_SONGS[i].id && song?.title === INITIAL_SONGS[i].title)
  );
}

// 선택 창에 보여 줄 개수
export function summarizeData(data) {
  const d = data ?? {};
  return { logs: list(d["muselog-logs"]).length, songs: list(d["muselog-songs"]).length };
}

// 무엇을 할지 정한다.
// cloud: 계정에 저장된 { updatedAt, data } 또는 null(없음), meta: normalizeSyncMeta 결과, localData: 이 브라우저 기록
// "upload" = 이 기기 기록을 계정에 올림, "download" = 계정 기록을 불러옴, "ask" = 사용자에게 물음, "none" = 할 일 없음
export function decideSync({ cloud, meta, userId, localData }) {
  const localHash = hashData(localData);
  const same = cloud ? hashData(cloud.data) === localHash : false;

  // 이 계정과 맞춘 적이 없는 브라우저 (처음 로그인, 또는 다른 계정이었음)
  if (meta.userId !== userId) {
    if (!cloud) return "upload";
    if (same) return "none";
    if (isEmptyData(localData)) return "download";
    return "ask";
  }

  if (!cloud) return "upload";
  const localChanged = localHash !== meta.hash;
  const cloudNewer = !meta.syncedAt || Date.parse(cloud.updatedAt) > Date.parse(meta.syncedAt);
  if (same) return "none";
  if (cloudNewer && !localChanged) return "download";
  if (cloudNewer && localChanged) return "ask";
  if (localChanged) return "upload";
  return "none";
}
