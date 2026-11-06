// 기록 백업 (순수 함수). 모든 기록을 한 덩어리로 묶고(buildBackup), 다시 푼다(parseBackup, planRestore).
// 나중에 로그인해서 서버에 저장할 때도 이 묶음 형식을 그대로 쓴다.
import { dateKey } from "./stats";

export const BACKUP_APP = "muselog";
export const BACKUP_VERSION = 1;

// 백업에 담는 localStorage 키 (CLAUDE.md 표와 같다). 이 밖의 키는 읽지도 쓰지도 않는다
export const BACKUP_KEYS = [
  "muselog-songs",
  "muselog-minutes",
  "muselog-goal",
  "muselog-logs",
  "muselog-events",
  "muselog-periods",
  "muselog-ideas",
  "muselog-song-sort",
  "muselog-metronome",
  "muselog-drone",
  "muselog-routine",
  "muselog-routine-checks",
  "muselog-tab-order",
];

// getItem(key): 저장된 글자 또는 null (localStorage.getItem과 같은 모양)
// 저장되지 않았거나 JSON으로 읽을 수 없는 키는 빼고 담는다
export function buildBackup(getItem, now = new Date()) {
  const data = {};
  BACKUP_KEYS.forEach(key => {
    const raw = getItem(key);
    if (raw === null || raw === undefined) return;
    try {
      data[key] = JSON.parse(raw);
    } catch {
      // 깨진 값은 백업하지 않는다
    }
  });
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), data };
}

export function backupFileName(now = new Date()) {
  return `muselog-backup-${dateKey(now)}.json`;
}

// 파일 글자 → { ok: true, backup } 또는 { ok: false, error: 사용자에게 보여줄 문구 }
export function parseBackup(text) {
  const notBackup = { ok: false, error: "MUSELOG 백업 파일이 아니에요." };
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return notBackup;
  }
  if (!parsed || typeof parsed !== "object" || parsed.app !== BACKUP_APP) return notBackup;
  const { data } = parsed;
  if (!data || typeof data !== "object" || Array.isArray(data)) return notBackup;
  if (Number(parsed.version) > BACKUP_VERSION) {
    return { ok: false, error: "더 새로운 버전의 백업 파일이라 불러올 수 없어요." };
  }
  return { ok: true, backup: parsed };
}

// 백업을 되살릴 때 할 일: 백업에 있는 키는 그 값으로 쓰고(set), 없는 키는 지운다(remove)
export function planRestore(backup) {
  const set = [];
  const remove = [];
  BACKUP_KEYS.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(backup.data, key)) set.push([key, JSON.stringify(backup.data[key])]);
    else remove.push(key);
  });
  return { set, remove };
}
