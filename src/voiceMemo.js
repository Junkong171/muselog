// 아이디어 음성 메모와 작업실 연습 녹음: 마이크로 녹음하고, 녹음 파일을 이 기기 브라우저(IndexedDB)에만 저장한다.
// 녹음 파일은 localStorage·백업·계정 동기화에 넣지 않는다 (아이디어의 audioSeconds만 함께 간다).
import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_RECORD_SECONDS } from "./lib/inspiration";
import { isInstalledApp, micErrorMessage } from "./lib/mic";

// ---------- 기기 저장 (IndexedDB: 브라우저의 큰 저장 공간) ----------
const DB_NAME = "muselog-audio";
const DB_VERSION = 2; // 1: memos, 2: practice 추가
const STORE = "memos"; // 열쇠 = 아이디어 id, 값 = 녹음 파일(Blob)
const PRACTICE_STORE = "practice"; // 열쇠 = 녹음 id, 값 = { id, createdAt, seconds, songTitle, blob }

function openDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB 없음"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    // 버전을 올릴 때 이미 있는 저장소(아이디어 녹음)는 그대로 두고 없는 것만 만든다
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(PRACTICE_STORE)) db.createObjectStore(PRACTICE_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, action, storeName = STORE) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const request = action(transaction.objectStore(storeName));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export const saveAudio = (id, blob) => withStore("readwrite", store => store.put(blob, id));
export const loadAudio = id => withStore("readonly", store => store.get(id));
export const deleteAudio = id => withStore("readwrite", store => store.delete(id));
export const savedAudioIds = () => withStore("readonly", store => store.getAllKeys());

// 작업실 연습 녹음
export const savePracticeRecording = recording => withStore("readwrite", store => store.put(recording), PRACTICE_STORE);
export const listPracticeRecordings = () => withStore("readonly", store => store.getAll(), PRACTICE_STORE);
export const deletePracticeRecording = id => withStore("readwrite", store => store.delete(id), PRACTICE_STORE);

// ---------- 녹음 ----------
// status: "idle"(녹음 없음) / "starting" / "recording" / "done"(녹음 있음)
// maxSeconds = 이만큼 녹음하면 저절로 끝낸다
// onComplete(blob, seconds) = 녹음이 끝날 때마다 부른다. 있으면 화면에서 사라질 때(탭 이동)도 그때까지 녹음한 것을 넘기고,
// 없으면 화면에서 사라질 때 녹음 중이던 것은 멈추고 버린다 (아이디어 음성 메모)
export function useVoiceRecorder({ maxSeconds = MAX_RECORD_SECONDS, onComplete = null } = {}) {
  const [status, setStatus] = useState("idle");
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState(null);
  const [error, setError] = useState("");
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const discardRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const maxSecondsRef = useRef(maxSeconds);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    maxSecondsRef.current = maxSeconds;
  });

  const releaseMic = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }, []);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    else releaseMic();
  }, [releaseMic]);

  const start = useCallback(async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined") {
      setError("이 브라우저에서는 녹음할 수 없어요. 최신 크롬·엣지·사파리에서 열어 주세요.");
      return;
    }
    setStatus("starting");
    let stream;
    try {
      // 노래·흥얼거림이 뭉개지지 않게 잡음 제거·울림 제거를 끈다
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
    } catch (err) {
      setError(micErrorMessage(err, isInstalledApp()));
      setStatus(blob ? "done" : "idle");
      return;
    }
    if (discardRef.current) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }
    streamRef.current = stream;
    let recorder;
    try {
      recorder = new MediaRecorder(stream);
    } catch {
      releaseMic();
      setError("이 브라우저에서는 녹음할 수 없어요. 최신 크롬·엣지·사파리에서 열어 주세요.");
      setStatus(blob ? "done" : "idle");
      return;
    }
    const chunks = [];
    recorder.ondataavailable = event => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      releaseMic();
      recorderRef.current = null;
      const unmounted = discardRef.current;
      if (unmounted && !onCompleteRef.current) return;
      const elapsed = (Date.now() - startedAtRef.current) / 1000;
      if (!chunks.length) {
        if (unmounted) return;
        setError("녹음된 소리가 없어요. 다시 녹음해 주세요.");
        setBlob(null);
        setStatus("idle");
        return;
      }
      const recorded = new Blob(chunks, { type: recorder.mimeType || chunks[0].type });
      const recordedSeconds = Math.min(Math.max(1, Math.round(elapsed)), maxSecondsRef.current);
      onCompleteRef.current?.(recorded, recordedSeconds);
      if (unmounted) return;
      setBlob(recorded);
      setSeconds(recordedSeconds);
      setStatus("done");
    };
    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    setBlob(null);
    setSeconds(0);
    recorder.start();
    setStatus("recording");
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startedAtRef.current) / 1000;
      setSeconds(Math.min(Math.floor(elapsed), maxSecondsRef.current));
      if (elapsed >= maxSecondsRef.current) stop();
    }, 250);
  }, [blob, releaseMic, stop]);

  const clear = useCallback(() => {
    setBlob(null);
    setSeconds(0);
    setStatus("idle");
    setError("");
  }, []);

  useEffect(() => {
    discardRef.current = false;
    return () => {
      discardRef.current = true;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      releaseMic();
    };
  }, [releaseMic]);

  return { status, seconds, blob, error, start, stop, clear };
}

// ---------- 듣기 ----------
// 한 번에 녹음 하나만 재생한다. playingId = 재생 중인 것의 이름표
export function useVoicePlayer() {
  const [playingId, setPlayingId] = useState(null);
  const [error, setError] = useState(null); // { id, message }
  const audioRef = useRef(null);
  const tokenRef = useRef(0);

  const stop = useCallback(() => {
    tokenRef.current += 1;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      URL.revokeObjectURL(audio.src);
      audioRef.current = null;
    }
    setPlayingId(null);
  }, []);

  // source: 녹음 파일(Blob) 또는 그것을 돌려주는 함수(기기 저장소에서 불러오기)
  const play = useCallback(
    async (id, source) => {
      stop();
      const token = tokenRef.current;
      setError(null);
      setPlayingId(id);
      try {
        const blob = typeof source === "function" ? await source() : source;
        if (token !== tokenRef.current) return;
        if (!blob) throw new Error("녹음 없음");
        const audio = new Audio(URL.createObjectURL(blob));
        audioRef.current = audio;
        audio.onended = () => {
          if (audioRef.current === audio) stop();
        };
        await audio.play();
      } catch {
        if (token !== tokenRef.current) return;
        stop();
        setError({ id, message: "녹음을 재생하지 못했어요. 다시 눌러 주세요." });
      }
    },
    [stop],
  );

  useEffect(() => stop, [stop]);

  return { playingId, error, play, stop };
}
