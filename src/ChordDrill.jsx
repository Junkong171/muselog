import { useEffect, useRef, useState } from "react";
import {
  clampDrillBpm,
  DRILL_BEAT_OPTIONS,
  DRILL_KEYS,
  DRILL_MAX_BPM,
  DRILL_MIN_BPM,
  DRILL_TYPES,
  drillPool,
  pickChord,
  toggleDrillType,
} from "./lib/chordDrill";

// 메트로놈과 같은 방식: 25ms마다 깨어나 앞으로 0.1초 안의 박을 AudioContext 시계에 예약하고,
// 박의 시각이 되면 화면(지금 코드·다음 코드·박 점)을 바꾼다
const SCHEDULE_EVERY_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.1;
const MAX_SCHEDULE_AHEAD_SEC = 2;
const CLICKS = { change: { frequency: 1500, volume: 0.9 }, beat: { frequency: 1000, volume: 0.55 } };

// 연습실 탭의 코드 전환 연습: 정한 박마다 무작위 코드를 띄우고 다음 코드를 미리 보여 준다
function ChordDrill({ settings, onChangeSettings }) {
  const [running, setRunning] = useState(false);
  const [shown, setShown] = useState(null); // { beat, current, next }
  const [error, setError] = useState("");
  const [bpmDraft, setBpmDraft] = useState(null); // BPM 칸에 쓰는 중인 글자 (입력 중이 아니면 null)

  const settingsRef = useRef(settings);
  const audioRef = useRef(null); // { ctx, master }
  const schedulerRef = useRef(null);
  const frameRef = useRef(null);
  const nextTimeRef = useRef(0);
  const nextBeatRef = useRef(0);
  const lastScheduleRef = useRef(null);
  const chordsRef = useRef({ current: null, next: null });
  const queueRef = useRef([]); // 화면 표시용 [{ time, beat, current, next }]

  // 연습 중 바뀐 설정은 다음 박·다음 뽑기부터 쓴다
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  function playClick(time, kind) {
    const { ctx, master } = audioRef.current;
    const { frequency, volume } = CLICKS[kind];
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
    const { ctx } = audioRef.current;
    const now = ctx.currentTime;
    const gap = lastScheduleRef.current === null ? 0 : now - lastScheduleRef.current;
    lastScheduleRef.current = now;
    const ahead = Math.min(Math.max(SCHEDULE_AHEAD_SEC, gap * 1.5), MAX_SCHEDULE_AHEAD_SEC);
    if (nextTimeRef.current < now) nextTimeRef.current = now + 0.02;
    while (nextTimeRef.current < now + ahead) {
      const time = nextTimeRef.current;
      const current = settingsRef.current;
      // 간격을 줄여서 다음 박 번호가 넘치면 코드를 바꾸는 박부터 다시 센다
      const beat = nextBeatRef.current < current.beats ? nextBeatRef.current : 0;
      if (beat === 0) {
        const pool = drillPool(current);
        const chords = chordsRef.current;
        const chord = chords.current === null ? pickChord(pool) : chords.next;
        chordsRef.current = { current: chord, next: pickChord(pool, chord) };
      }
      if (current.click) playClick(time, beat === 0 ? "change" : "beat");
      queueRef.current.push({ time, beat, ...chordsRef.current });
      nextBeatRef.current = beat + 1;
      nextTimeRef.current += 60 / current.bpm;
    }
  }

  function draw() {
    const { ctx } = audioRef.current;
    const queue = queueRef.current;
    let latest = null;
    while (queue.length && queue[0].time <= ctx.currentTime) latest = queue.shift();
    if (latest) setShown(latest);
    frameRef.current = requestAnimationFrame(draw);
  }

  function start() {
    try {
      if (!audioRef.current) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioRef.current = { ctx, master: null };
      }
    } catch {
      setError("이 브라우저에서는 소리를 낼 수 없어요.");
      return;
    }
    setError("");
    const audio = audioRef.current;
    audio.ctx.resume();
    // 정지할 때 연결을 끊어 이미 예약된 소리까지 멈추도록, 시작할 때마다 새 출력선을 만든다
    audio.master = audio.ctx.createGain();
    audio.master.connect(audio.ctx.destination);
    nextTimeRef.current = audio.ctx.currentTime + 0.05;
    nextBeatRef.current = 0;
    lastScheduleRef.current = null;
    chordsRef.current = { current: null, next: null };
    queueRef.current = [];
    schedule();
    schedulerRef.current = setInterval(schedule, SCHEDULE_EVERY_MS);
    frameRef.current = requestAnimationFrame(draw);
    setRunning(true);
  }

  function stop() {
    clearInterval(schedulerRef.current);
    cancelAnimationFrame(frameRef.current);
    audioRef.current?.master?.disconnect();
    setShown(null);
    setRunning(false);
  }

  // 탭을 떠나면(화면에서 사라지면) 멈추고 오디오를 닫는다
  useEffect(() => () => {
    clearInterval(schedulerRef.current);
    cancelAnimationFrame(frameRef.current);
    audioRef.current?.ctx.close();
  }, []);

  function change(field, value) {
    onChangeSettings({ ...settings, [field]: value });
  }

  function changeBpm(value) {
    const bpm = clampDrillBpm(value);
    if (bpm !== null) change("bpm", bpm);
  }

  const bpmText = bpmDraft ?? String(settings.bpm);

  function finishBpmEdit() {
    if (bpmDraft) changeBpm(bpmDraft);
    setBpmDraft(null);
  }

  return (
    <section className="chart-card chord-drill">
      <div className="chart-head">
        <h3>코드 전환 연습</h3>
        <div className="metro-beats" role="group" aria-label="코드 범위">
          {[["all", "전체"], ["key", "조 안에서"]].map(([value, label]) => (
            <button key={value} className={settings.scope === value ? "active" : ""} aria-pressed={settings.scope === value} onClick={() => change("scope", value)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="drill-display" aria-live="polite">
        {shown ? (
          <>
            <strong className="drill-current">{shown.current}</strong>
            <span className="drill-next">다음: {shown.next}</span>
          </>
        ) : (
          <span className="drill-idle">시작을 누르면 코드가 나와요</span>
        )}
        <div className="drill-dots" aria-label={shown ? `${settings.beats}박 중 ${shown.beat + 1}박` : undefined}>
          {Array.from({ length: settings.beats }, (_, i) => (
            <span key={i} className={shown && i <= shown.beat ? "on" : ""} />
          ))}
        </div>
      </div>

      {settings.scope === "all" ? (
        <div className="metro-beats drill-options" role="group" aria-label="코드 종류 (여러 개 고르기)">
          {DRILL_TYPES.map(type => {
            const on = settings.types.includes(type.value);
            return (
              <button key={type.value} className={on ? "active" : ""} aria-pressed={on} onClick={() => change("types", toggleDrillType(settings.types, type.value))}>
                {type.label}
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="drone-notes" role="group" aria-label="조 (장조)">
            {DRILL_KEYS.map(key => (
              <button key={key} className={settings.key === key ? "active" : ""} aria-pressed={settings.key === key} onClick={() => change("key", key)}>
                {key}
              </button>
            ))}
          </div>
          <div className="metro-beats drill-options" role="group" aria-label="3화음 또는 7화음">
            {[[false, "3화음"], [true, "7화음"]].map(([value, label]) => (
              <button key={label} className={settings.sevenths === value ? "active" : ""} aria-pressed={settings.sevenths === value} onClick={() => change("sevenths", value)}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
      <p className="metro-hint drill-pool">{drillPool(settings).length}개 코드에서 뽑아요{settings.scope === "key" && `: ${drillPool(settings).join(" ")}`}</p>

      <div className="metro-bpm drill-bpm">
        <button className="cal-nav" onClick={() => changeBpm(settings.bpm - 1)} aria-label="BPM 1 낮추기">−</button>
        <div className="metro-bpm-value">
          <strong>
            <input
              className="metro-bpm-input"
              value={bpmText}
              onFocus={e => {
                setBpmDraft(String(settings.bpm));
                e.target.select();
              }}
              onChange={e => setBpmDraft(e.target.value.replace(/\D/g, "").slice(0, 3))}
              onKeyDown={e => e.key === "Enter" && e.target.blur()}
              onBlur={finishBpmEdit}
              style={{ width: `${Math.max(bpmText.length, 2)}ch` }}
              inputMode="numeric"
              maxLength={3}
              autoComplete="off"
              aria-label={`BPM 직접 입력 (${DRILL_MIN_BPM}~${DRILL_MAX_BPM})`}
            />
          </strong>
          <span className="metro-label">BPM</span>
        </div>
        <button className="cal-nav" onClick={() => changeBpm(settings.bpm + 1)} aria-label="BPM 1 높이기">+</button>
      </div>

      <div className="metro-beats drill-options" role="group" aria-label="바꾸는 간격">
        {DRILL_BEAT_OPTIONS.map(beats => (
          <button key={beats} className={settings.beats === beats ? "active" : ""} aria-pressed={settings.beats === beats} onClick={() => change("beats", beats)}>
            {beats}박마다
          </button>
        ))}
        <button className={settings.click ? "active" : ""} aria-pressed={settings.click} onClick={() => change("click", !settings.click)}>
          박 소리 {settings.click ? "켜짐" : "꺼짐"}
        </button>
      </div>

      {error && <p className="tuner-error" role="alert">{error}</p>}

      <div className="metro-actions">
        <button className="primary-button" onClick={running ? stop : start}>
          {running ? "정지" : "시작"}
        </button>
      </div>
    </section>
  );
}

export default ChordDrill;
