import { useCallback, useEffect, useRef, useState } from "react";
import { noteFileUrl } from "./lib/inspiration";
import { INSTRUMENTS } from "./lib/inspirationData";

const CHORD_SECONDS = 2;

// 한 번 받은 음원은 다시 받지 않는다. 실패하면 다음에 다시 시도하도록 지운다
const noteFiles = new Map();

function fetchNoteFile(url) {
  if (!noteFiles.has(url)) {
    const request = fetch(url).then(response => {
      if (!response.ok) throw new Error(`음원을 받지 못함: ${url}`);
      return response.arrayBuffer();
    });
    request.catch(() => noteFiles.delete(url));
    noteFiles.set(url, request);
  }
  return noteFiles.get(url);
}

// 필요한 음을 모두 받아 { 음 번호: 소리 } 로 돌려준다
async function loadNotes(ctx, instrumentId, notes) {
  const buffers = await Promise.all(notes.map(async midi => {
    const file = await fetchNoteFile(noteFileUrl(instrumentId, midi));
    return [midi, await ctx.decodeAudioData(file.slice(0))];
  }));
  return Object.fromEntries(buffers);
}

// 코드 하나를 예약한다. 맨 앞 음이 베이스라 함께 울리고, 음이 많으면 소리가 뭉치지 않게 줄인다.
function scheduleChord(ctx, buffers, instrument, notes, time, seconds) {
  const end = time + seconds;
  const level = instrument.gain * Math.min(1, 4 / notes.length);
  notes.forEach((midi, i) => {
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffers[midi];
    gain.gain.setValueAtTime(level, time);
    gain.gain.setValueAtTime(level, end - 0.08);
    gain.gain.linearRampToValueAtTime(0.0001, end);
    source.connect(gain).connect(ctx.destination);
    source.start(time + i * instrument.strum);
    source.stop(end);
  });
}

// 영감 탭, 수첩 탭, 연습실 코드표가 함께 쓰는 코드 재생. 화면에서 사라지면 소리를 멈춘다.
// id = 무엇을 재생하는지 구분하는 값 (수첩의 아이디어 id, 하나뿐이면 생략)
export function useChordPlayer() {
  const [activeId, setActiveId] = useState(null);
  const [loadingSound, setLoadingSound] = useState(false);
  const [playingIndex, setPlayingIndex] = useState(null); // 지금 나는 코드 번호, null = 재생 안 함
  const [audioError, setAudioError] = useState(null); // null / { id, type: "unsupported" | "load" }
  const playbackRef = useRef(null); // { ctx, timer }

  const stop = useCallback(() => {
    const playback = playbackRef.current;
    if (!playback) return;
    playbackRef.current = null;
    clearInterval(playback.timer);
    playback.ctx.close();
    setActiveId(null);
    setLoadingSound(false);
    setPlayingIndex(null);
  }, []);

  useEffect(() => stop, [stop]);

  // chordList = 코드마다 음 번호 배열, seconds = 코드 하나의 길이 (연습실 스케일은 한 음씩 짧게)
  async function play(instrumentId, chordList, id = null, seconds = CHORD_SECONDS) {
    stop();
    setAudioError(null);
    let ctx = null;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume().catch(() => {});
    } catch {
      ctx?.close();
      setAudioError({ id, type: "unsupported" });
      return;
    }
    const playback = { ctx, timer: null };
    playbackRef.current = playback;
    setActiveId(id);
    setLoadingSound(true);
    try {
      const instrument = INSTRUMENTS.find(item => item.id === instrumentId);
      const buffers = await loadNotes(ctx, instrumentId, [...new Set(chordList.flat())]);
      if (playbackRef.current !== playback) return; // 받는 동안 멈췄거나 선택이 바뀜
      setLoadingSound(false);
      const start = ctx.currentTime + 0.05;
      chordList.forEach((notes, i) => {
        scheduleChord(ctx, buffers, instrument, notes, start + i * seconds, seconds);
      });
      setPlayingIndex(0);
      // 소리는 AudioContext가 정확히 내고, 화면 강조만 시계를 보고 따라간다
      playback.timer = setInterval(() => {
        const index = Math.floor((ctx.currentTime - start) / seconds);
        if (index >= chordList.length) stop();
        else setPlayingIndex(Math.max(0, index));
      }, 50);
    } catch {
      if (playbackRef.current !== playback) return;
      stop();
      setAudioError({ id, type: "load" });
    }
  }

  return { activeId, loadingSound, playingIndex, audioError, play, stop };
}
