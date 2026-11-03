import { useEffect, useState } from "react";
import {
  formatClock,
  MAX_TIMER_MINUTES,
  normalizeTimer,
  parseTimerMinutes,
  readTimer,
  restTimer,
  resumeTimer,
  startTimer,
  timerMinutes,
} from "./lib/timer";

const STORAGE_KEY = "muselog-timer";

const currentTime = () => Date.now();

function loadTimer() {
  try {
    return normalizeTimer(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return null;
  }
}

// 모든 탭 위쪽의 연습 타이머. 1초마다 바뀌므로 App 전체가 다시 그려지지 않게 상태를 여기에 둔다
function PracticeTimer({ songs, onSave }) {
  const [timer, setTimer] = useState(loadTimer);
  const [now, setNow] = useState(currentTime);
  const [ended, setEnded] = useState(null); // "연습 종료"를 누른 순간의 시간, null = 저장 칸 닫힘
  const [songId, setSongId] = useState("");
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [minutesError, setMinutesError] = useState(false);

  useEffect(() => {
    if (timer) localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
    else localStorage.removeItem(STORAGE_KEY);
  }, [timer]);

  useEffect(() => {
    if (!timer) return undefined;
    const interval = setInterval(() => setNow(currentTime()), 500);
    return () => clearInterval(interval);
  }, [timer]);

  function change(action) {
    const time = currentTime();
    setNow(time);
    setTimer(current => action(current, time));
  }

  function endPractice() {
    const reading = readTimer(timer, currentTime());
    setEnded(reading);
    setSongId("");
    const filled = timerMinutes(reading.practiceMs);
    setMinutes(String(filled));
    setNote("");
    setMinutesError(filled > MAX_TIMER_MINUTES); // 켜 둔 채 잊었으면 저장하기 전에 알려 준다
  }

  function closeTimer() {
    setEnded(null);
    setTimer(null);
  }

  function saveRecord(e) {
    e.preventDefault();
    const duration = parseTimerMinutes(minutes);
    if (duration === null) {
      setMinutesError(true);
      return;
    }
    onSave(duration, songId, note.trim() || "연습 내용 미입력");
    closeTimer();
  }

  function discard() {
    if (window.confirm("이번 연습을 기록하지 않고 버릴까요?")) closeTimer();
  }

  if (!timer) {
    return (
      <section className="practice-timer">
        <button className="primary-button" onClick={() => change((_, time) => startTimer(time))}>
          지금 연습 시작
        </button>
      </section>
    );
  }

  if (ended) {
    return (
      <section className="practice-timer ended">
        <p className="timer-summary">
          연습 <strong>{formatClock(ended.practiceMs)}</strong>
          {ended.restMs > 0 && <span> · 휴식 {formatClock(ended.restMs)}</span>}
        </p>
        <form className="timer-form" onSubmit={saveRecord} noValidate>
          <label>
            곡
            <select value={songId} onChange={e => setSongId(e.target.value)}>
              <option value="">자유 연습</option>
              {songs.map(song => (
                <option key={song.id} value={song.id}>{song.title}</option>
              ))}
            </select>
          </label>
          <label>
            연습 시간(분)
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max={MAX_TIMER_MINUTES}
              value={minutes}
              onChange={e => { setMinutes(e.target.value); setMinutesError(false); }}
            />
          </label>
          <label className="timer-note">
            메모
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="오늘 무엇을 연습했나요?" />
          </label>
          {minutesError && <p className="time-error timer-error">연습 시간은 1~{MAX_TIMER_MINUTES}분 사이의 정수로 적어 주세요.</p>}
          <div className="timer-actions">
            <button className="primary-button" type="submit">기록 저장</button>
            <button className="practice-button" type="button" onClick={() => { setNow(currentTime()); setEnded(null); }}>계속하기</button>
            <button className="practice-button" type="button" onClick={discard}>버리기</button>
          </div>
        </form>
      </section>
    );
  }

  const reading = readTimer(timer, now);
  const resting = timer.status === "resting";
  return (
    <section className={`practice-timer ${resting ? "resting" : "running"}`}>
      <p className="timer-summary" role="timer">
        {resting ? (
          <>휴식 중 <strong>{formatClock(reading.restMs)}</strong><span> · 연습 {formatClock(reading.practiceMs)}</span></>
        ) : (
          <>연습 중 <strong>{formatClock(reading.practiceMs)}</strong></>
        )}
      </p>
      <div className="timer-actions">
        {resting ? (
          <button className="primary-button" onClick={() => change(resumeTimer)}>다시 시작</button>
        ) : (
          <button className="practice-button" onClick={() => change(restTimer)}>휴식</button>
        )}
        <button className={resting ? "practice-button" : "primary-button"} onClick={endPractice}>연습 종료</button>
      </div>
    </section>
  );
}

export default PracticeTimer;
