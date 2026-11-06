// 작업실 연습 녹음 계산 (순수 함수). 녹음과 저장은 voiceMemo.js, 화면은 PracticeRecorder.jsx에서 한다.

export const MAX_PRACTICE_SECONDS = 600; // 한 번에 10분까지
export const MAX_PRACTICE_RECORDINGS = 20; // 기기에 20개까지

// 최근 녹음이 위로
export function sortRecordings(list) {
  return [...list].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

// "11월 7일 오후 3:05" (이 기기 시각 기준)
export function formatRecordingDate(createdAt) {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "";
  const hours = d.getHours();
  const ampm = hours < 12 ? "오전" : "오후";
  const hour12 = hours % 12 || 12;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${ampm} ${hour12}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// 녹음 형식(MIME) → 파일 확장자. 모르는 형식은 webm
export function audioExtension(mimeType = "") {
  const type = mimeType.split(";")[0].trim().toLowerCase();
  if (type === "audio/mp4" || type === "audio/x-m4a" || type === "audio/aac") return "m4a";
  if (type === "audio/ogg") return "ogg";
  if (type === "audio/mpeg") return "mp3";
  if (type === "audio/wav" || type === "audio/x-wav") return "wav";
  return "webm";
}

// "muselog-녹음-2026-11-07-1505.webm"
export function recordingFileName(createdAt, mimeType) {
  const d = new Date(createdAt);
  const pad = n => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `muselog-녹음-${stamp}.${audioExtension(mimeType)}`;
}
