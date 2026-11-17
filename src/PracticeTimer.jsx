import { useEffect, useState } from "react";
import {
  formatClock,
  MAX_TIMER_MINUTES,
  normalizeTimer,
  parseTimerMinutes,
  readTimer,
  restAlertMinutes,
  restTimer,
  resumeTimer,
  startTimer,
  timerMinutes,
} from "./lib/timer";
import { EMPTY_NOTE } from "./lib/practiceLogs";

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
// onSave(분, 곡 id, 메모)는 저장한 기록의 id를 돌려준다. onEditLog(id) = 연습 기록 탭에서 그 기록 고치기
function PracticeTimer({ songs, onSave, onEditLog, onActiveChange }) {
  const [timer, setTimer] = useState(loadTimer);
  const [now, setNow] = useState(currentTime);
  const [ended, setEnded] = useState(null); // "연습 종료"를 누른 순간의 시간, null = 저장 칸 닫힘
  const [songId, setSongId] = useState("");
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [minutesError, setMinutesError] = useState(false);
  const [closedAlert, setClosedAlert] = useState(0); // 닫은 휴식 알림의 분. 이보다 큰 알림만 보인다
  const [saved, setSaved] = useState(null); // 방금 바로 저장한 기록 { id, minutes, restMs }, null = 안내 없음

  useEffect(() => {
    if (timer) localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
    else localStorage.removeItem(STORAGE_KEY);
  }, [timer]);

  useEffect(() => {
    onActiveChange(timer !== null);
  }, [timer, onActiveChange]);

  useEffect(() => {
    if (!timer) return undefined;
    const interval = setInterval(() => setNow(currentTime()), 500);
    return () => clearInterval(interval);
  }, [timer]);

  function change(action) {
    const time = currentTime();
    setNow(time);
    setClosedAlert(0);
    setTimer(current => action(current, time));
  }

  // 연습 종료 = 바로 저장 (F-036). 켜 둔 채 잊어 600분이 넘으면 저장 칸에서 시간을 고치게 한다
  function endPractice() {
    const reading = readTimer(timer, currentTime());
    const filled = timerMinutes(reading.practiceMs);
    if (filled <= MAX_TIMER_MINUTES) {
      const id = onSave(filled, "", EMPTY_NOTE);
      setSaved({ id, minutes: filled, restMs: reading.restMs });
      setTimer(null);
      return;
    }
    setEnded(reading);
    setSongId("");
    setMinutes(String(filled));
    setNote("");
    setMinutesError(true);
  }

  function editSaved() {
    onEditLog(saved.id);
    setSaved(null);
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
    onSave(duration, songId, note.trim() || EMPTY_NOTE);
    closeTimer();
  }

  function discard() {
    if (window.confirm("이번 연습을 기록하지 않고 버릴까요?")) closeTimer();
  }

  if (!timer) {
    return (
      <section className={`practice-timer${saved ? " saved" : ""}`}>
        {saved && (
          <p className="timer-summary" role="status">
            연습 <strong>{saved.minutes}분</strong>을 기록했어요
            {saved.restMs > 0 && <span> · 휴식 {formatClock(saved.restMs)} 제외</span>}
          </p>
        )}
        <div className="timer-actions">
          {saved && (
            <>
              <button className="primary-button" onClick={editSaved}>곡·메모 적기</button>
              <button className="practice-button" onClick={() => setSaved(null)}>닫기</button>
            </>
          )}
          <button
            className={saved ? "practice-button" : "primary-button"}
            onClick={() => { setSaved(null); change((_, time) => startTimer(time)); }}
          >
            지금 연습 시작
          </button>
        </div>
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
  const alertMinutes = restAlertMinutes(timer, now);
  return (
    <section className={`practice-timer ${resting ? "resting" : "running"}`}>
      {alertMinutes > closedAlert && (
        <div className="rest-alert" role="alert">
          <span>휴식한 지 {alertMinutes}분 지났어요</span>
          <div className="timer-actions">
            <button className="primary-button" onClick={() => change(resumeTimer)}>다시 시작</button>
            <button className="practice-button" onClick={() => setClosedAlert(alertMinutes)}>닫기</button>
          </div>
        </div>
      )}
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
