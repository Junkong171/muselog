import { useEffect, useRef, useState } from "react";
import {
  addTap,
  BEAT_OPTIONS,
  calcTapBpm,
  clampBpm,
  elapsedToMinutes,
  formatElapsed,
  MAX_BPM,
  metronomeNote,
  MIN_BPM,
  SUBDIVISION_OPTIONS,
  toggleAccent,
} from "./lib/metronome";

// 소리를 미리 예약하는 방식: 25ms마다 깨어나 앞으로 0.1초 안에 날 박을 AudioContext 시계에 예약한다.
// setInterval이 조금 늦어도 소리 시각은 AudioContext가 정확히 지킨다.
// 다른 탭을 보는 동안 브라우저가 타이머를 1초 간격으로 늦추면, 늦어진 만큼 더 멀리 예약한다.
const SCHEDULE_EVERY_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.1;
const MAX_SCHEDULE_AHEAD_SEC = 2;

const CLICK_SOUNDS = {
  accent: { frequency: 1500, volume: 0.9 },
  beat: { frequency: 1000, volume: 0.6 },
  sub: { frequency: 700, volume: 0.25 },
};

// 셋잇단음표 기호: 묶인 8분음표 3개 위에 작은 "3" (글자 하나로 된 기호가 없어 직접 그린다)
function TripletIcon() {
  return (
    <svg className="triplet-icon" viewBox="0 -1 30 27" width="26" height="23" aria-hidden="true">
      <text x="17.2" y="6" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="currentColor">3</text>
      <rect x="7.4" y="8.5" width="19.6" height="2.6" fill="currentColor" />
      {[5, 14, 23].map(x => (
        <g key={x}>
          <ellipse cx={x} cy="21.5" rx="3.3" ry="2.3" transform={`rotate(-20 ${x} 21.5)`} fill="currentColor" />
          <rect x={x + 2.4} y="8.5" width="1.4" height="13" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}

function Metronome({ settings, onChangeSettings, songs, onSaveLog }) {
  const [running, setRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [elapsed, setElapsed] = useState(0); // 이번 연습 시간 (초)
  const [songId, setSongId] = useState("");
  const [bpmDraft, setBpmDraft] = useState(null); // BPM 입력 칸에 쓰는 중인 글자 (입력 중이 아니면 null)
  const cancelBpmEditRef = useRef(false);

  const settingsRef = useRef(settings);
  const audioRef = useRef(null); // { ctx, master }
  const schedulerRef = useRef(null);
  const frameRef = useRef(null);
  const nextNoteTimeRef = useRef(0);
  const nextBeatRef = useRef(0);
  const nextSubRef = useRef(0); // 박 안에서 몇 번째 리듬 소리인지 (0 = 박)
  const beatSettingsRef = useRef(settings); // 지금 박에 쓰는 설정
  const lastScheduleRef = useRef(null); // 직전에 예약한 AudioContext 시각
  const beatQueueRef = useRef([]); // 화면 표시용 [{ beat, time }]
  const startedAtRef = useRef(null);
  const accumulatedRef = useRef(0); // 정지 전까지 쌓인 시간 (ms)
  const tapsRef = useRef([]);

  // 재생 중 바뀐 설정은 다음 박부터 적용
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  function readElapsed() {
    const runningMs = startedAtRef.current === null ? 0 : performance.now() - startedAtRef.current;
    return (accumulatedRef.current + runningMs) / 1000;
  }

  // kind: 강조한 박("accent") / 박("beat") / 박 사이 리듬("sub", 더 낮고 작게)
  function playClick(ctx, master, time, kind) {
    const { frequency, volume } = CLICK_SOUNDS[kind];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    osc.connect(gain).connect(master);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  function schedule() {
    const { ctx, master } = audioRef.current;
    const now = ctx.currentTime;
    const gap = lastScheduleRef.current === null ? 0 : now - lastScheduleRef.current;
    lastScheduleRef.current = now;
    const ahead = Math.min(Math.max(SCHEDULE_AHEAD_SEC, gap * 1.5), MAX_SCHEDULE_AHEAD_SEC);
    // 너무 늦게 깨어났으면 지나간 박을 몰아서 내지 않고 지금부터 다시 맞춘다
    if (nextNoteTimeRef.current < now) nextNoteTimeRef.current = now + 0.02;
    while (nextNoteTimeRef.current < now + ahead) {
      const time = nextNoteTimeRef.current;
      if (nextSubRef.current === 0) {
        // 박의 시작: 이 박이 끝날 때까지 쓸 설정을 정한다 (바뀐 설정은 다음 박부터)
        beatSettingsRef.current = settingsRef.current;
        const { beats, accents } = beatSettingsRef.current;
        // 박자 수를 줄여서 다음 박 번호가 넘치면 1번 박부터 다시 시작
        const beat = nextBeatRef.current < beats ? nextBeatRef.current : 0;
        playClick(ctx, master, time, accents.includes(beat + 1) ? "accent" : "beat");
        beatQueueRef.current.push({ beat, time });
        nextBeatRef.current = (beat + 1) % beats;
      } else {
        playClick(ctx, master, time, "sub");
      }
      const { bpm, subdivision } = beatSettingsRef.current;
      nextNoteTimeRef.current += 60 / bpm / subdivision;
      nextSubRef.current = (nextSubRef.current + 1) % subdivision;
    }
  }

  // 예약한 박의 시각이 되면 박 표시 점을 옮긴다
  function draw() {
    const { ctx } = audioRef.current;
    const queue = beatQueueRef.current;
    let shown = null;
    while (queue.length && queue[0].time <= ctx.currentTime) shown = queue.shift().beat;
    if (shown !== null) setCurrentBeat(shown);
    frameRef.current = requestAnimationFrame(draw);
  }

  function start() {
    if (!audioRef.current) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioRef.current = { ctx, master: null };
    }
    const audio = audioRef.current;
    audio.ctx.resume();
    // 정지할 때 연결을 끊어 이미 예약된 소리까지 멈추도록, 시작할 때마다 새 출력선을 만든다
    audio.master = audio.ctx.createGain();
    audio.master.connect(audio.ctx.destination);

    nextNoteTimeRef.current = audio.ctx.currentTime + 0.05;
    nextBeatRef.current = 0;
    nextSubRef.current = 0;
    lastScheduleRef.current = null;
    beatQueueRef.current = [];
    schedule();
    schedulerRef.current = setInterval(schedule, SCHEDULE_EVERY_MS);
    frameRef.current = requestAnimationFrame(draw);
    startedAtRef.current = performance.now();
    setRunning(true);
  }

  function stop() {
    clearInterval(schedulerRef.current);
    cancelAnimationFrame(frameRef.current);
    audioRef.current?.master?.disconnect();
    if (startedAtRef.current !== null) {
      accumulatedRef.current += performance.now() - startedAtRef.current;
      startedAtRef.current = null;
    }
    setElapsed(readElapsed());
    setCurrentBeat(-1);
    setRunning(false);
  }

  // 재생 중에는 이번 연습 시간을 계속 갱신
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed(readElapsed()), 250);
    return () => clearInterval(id);
  }, [running]);

  // 탭을 떠나면(화면에서 사라지면) 소리를 멈추고 오디오를 닫는다
  useEffect(() => () => {
    clearInterval(schedulerRef.current);
    cancelAnimationFrame(frameRef.current);
    audioRef.current?.ctx.close();
  }, []);

  function changeBpm(value) {
    const bpm = clampBpm(value);
    if (bpm !== null) onChangeSettings({ ...settings, bpm });
  }

  // 직접 입력: 입력하는 동안에는 빠르기를 바꾸지 않고, Enter나 칸 밖을 누를 때 적용한다.
  // 비우고 나오거나 Esc를 누르면 입력 전 값으로 돌아간다.
  const bpmText = bpmDraft ?? String(settings.bpm);

  function finishBpmEdit() {
    if (!cancelBpmEditRef.current && bpmDraft) changeBpm(bpmDraft);
    cancelBpmEditRef.current = false;
    setBpmDraft(null);
  }

  function tap() {
    tapsRef.current = addTap(tapsRef.current, performance.now());
    const bpm = calcTapBpm(tapsRef.current);
    if (bpm !== null) changeBpm(bpm);
  }

  const savableMinutes = elapsedToMinutes(elapsed);

  function saveLog() {
    if (running) stop();
    // 화면 값은 250ms마다 갱신되므로, 저장할 때는 정지한 시점까지를 다시 계산한다
    const minutes = elapsedToMinutes(readElapsed());
    if (minutes < 1) return;
    onSaveLog(minutes, songId, metronomeNote(settings));
    accumulatedRef.current = 0;
    setElapsed(0);
  }

  return (
    <section className="chart-card metronome">
      <div className="chart-head">
        <h3>메트로놈</h3>
        <span>BPM {MIN_BPM}~{MAX_BPM}</span>
      </div>

      <div className="metro-bpm">
        <button className="cal-nav" onClick={() => changeBpm(settings.bpm - 1)} aria-label="BPM 1 낮추기">−</button>
        <div className="metro-bpm-value">
          <strong>
            <span className="metro-note">♩</span> ={" "}
            <input
              className="metro-bpm-input"
              value={bpmText}
              onFocus={e => {
                setBpmDraft(String(settings.bpm));
                e.target.select();
              }}
              onChange={e => setBpmDraft(e.target.value.replace(/\D/g, "").slice(0, 3))}
              onKeyDown={e => {
                if (e.key === "Enter") e.target.blur();
                if (e.key === "Escape") {
                  cancelBpmEditRef.current = true;
                  e.target.blur();
                }
              }}
              onBlur={finishBpmEdit}
              style={{ width: `${Math.max(bpmText.length, 2)}ch` }}
              inputMode="numeric"
              maxLength={3}
              autoComplete="off"
              aria-label={`BPM 직접 입력 (${MIN_BPM}~${MAX_BPM})`}
            />
          </strong>
        </div>
        <button className="cal-nav" onClick={() => changeBpm(settings.bpm + 1)} aria-label="BPM 1 높이기">+</button>
      </div>
      <input
        className="metro-slider"
        type="range"
        min={MIN_BPM}
        max={MAX_BPM}
        value={settings.bpm}
        onChange={e => changeBpm(e.target.value)}
        aria-label="BPM"
      />

      {/* 박 버튼: 누르면 그 박의 강조를 켜고 끄며, 재생 중에는 지금 박이 켜진다 */}
      <div className="metro-beat-buttons" role="group" aria-label="강조할 박">
        {Array.from({ length: settings.beats }, (_, i) => {
          const accented = settings.accents.includes(i + 1);
          return (
            <button
              key={i}
              className={`metro-beat ${accented ? "accented" : ""} ${running && i === currentBeat ? "on" : ""}`}
              aria-pressed={accented}
              aria-label={`${i + 1}번 박 강조`}
              onClick={() => onChangeSettings({ ...settings, accents: toggleAccent(settings.accents, i + 1) })}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <p className="metro-hint metro-beat-hint">숫자를 눌러 강조할 박을 고르세요.</p>

      <div className="metro-controls">
        <div className="metro-beats" role="group" aria-label="마디당 박자 수">
          {BEAT_OPTIONS.map(beats => (
            <button
              key={beats}
              className={settings.beats === beats ? "active" : ""}
              aria-pressed={settings.beats === beats}
              onClick={() => onChangeSettings({ ...settings, beats })}
            >
              {beats}박
            </button>
          ))}
        </div>
      </div>

      <div className="metro-controls metro-rhythm">
        <span className="metro-label">리듬</span>
        <div className="metro-beats" role="group" aria-label="리듬 (한 박을 나누는 음표)">
          {SUBDIVISION_OPTIONS.map(option => (
            <button
              key={option.value}
              className={`note ${settings.subdivision === option.value ? "active" : ""}`}
              aria-pressed={settings.subdivision === option.value}
              aria-label={option.name}
              title={option.name}
              onClick={() => onChangeSettings({ ...settings, subdivision: option.value })}
            >
              {option.symbol ?? <TripletIcon />}
            </button>
          ))}
        </div>
      </div>

      <div className="metro-actions">
        <button className="primary-button" onClick={running ? stop : start}>
          {running ? "정지" : "시작"}
        </button>
        <button className="practice-button" onClick={tap}>탭</button>
      </div>

      <div className="metro-log">
        <div className="metro-elapsed">
          <span>이번 연습 시간</span>
          <strong>{formatElapsed(elapsed)}</strong>
        </div>
        <select value={songId} onChange={e => setSongId(e.target.value)} aria-label="연습곡">
          <option value="">자유 연습</option>
          {songs.map(song => (
            <option key={song.id} value={song.id}>{song.title}</option>
          ))}
        </select>
        <button className="primary-button" onClick={saveLog} disabled={savableMinutes < 1}>
          연습 기록에 저장
        </button>
      </div>
      {savableMinutes < 1 && <p className="metro-hint">1분 이상 연습하면 저장할 수 있어요.</p>}
    </section>
  );
}

export default Metronome;
