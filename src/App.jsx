import { Fragment, useEffect, useRef, useState } from "react";
import "./App.css";
import { dateKey, sumMinutesByDay, calcStreak, getWeekDays, rankSongs } from "./lib/stats";
import {
  getMonthGrid,
  calcDday,
  combineTime,
  filterOptions,
  formatDday,
  formatDateLabel,
  formatEventTime,
  HOUR_OPTIONS,
  MINUTE_OPTIONS,
  normalizeEvents,
  sortEvents,
  upcomingEvents,
} from "./lib/calendar";

const initialSongs = [
  { id: 1, title: "밤편지", artist: "아이유", type: "보컬", progress: 75 },
  { id: 2, title: "너를 생각해", artist: "주시크", type: "기타", progress: 45 },
  { id: 3, title: "사랑은 늘 도망가", artist: "임영웅", type: "보컬", progress: 30 },
];

const TABS = ["대시보드", "내 연습곡", "연습 기록", "연습 통계", "캘린더"];
const TAB_ICONS = ["⌂", "♫", "▤", "◔", "▦"];
const CAL_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function loadData(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function App() {
  const [songs, setSongs] = useState(() => loadData("muselog-songs", initialSongs));
  const [minutes, setMinutes] = useState(() => loadData("muselog-minutes", 0));
  const [goal, setGoal] = useState(() => loadData("muselog-goal", 60));
  const [logs, setLogs] = useState(() => loadData("muselog-logs", []));
  const [newTitle, setNewTitle] = useState("");
  const [newArtist, setNewArtist] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("대시보드");
  const [logMinutes, setLogMinutes] = useState("15");
  const [logNote, setLogNote] = useState("");
  const [logSongId, setLogSongId] = useState("");
  const [events, setEvents] = useState(() => normalizeEvents(loadData("muselog-events", [])));
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [eventTitle, setEventTitle] = useState("");
  const [eventMemo, setEventMemo] = useState("");
  const [eventHour, setEventHour] = useState("");
  const [eventMinute, setEventMinute] = useState("");
  const [openTimeList, setOpenTimeList] = useState(null); // "hour" | "minute" | null
  const [timeListFiltered, setTimeListFiltered] = useState(false);
  const [timeError, setTimeError] = useState(false);
  const minuteInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("muselog-songs", JSON.stringify(songs));
  }, [songs]);

  useEffect(() => {
    localStorage.setItem("muselog-minutes", JSON.stringify(minutes));
  }, [minutes]);

  useEffect(() => {
    localStorage.setItem("muselog-goal", JSON.stringify(goal));
  }, [goal]);

  useEffect(() => {
    localStorage.setItem("muselog-logs", JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem("muselog-events", JSON.stringify(events));
  }, [events]);

  const today = new Date().toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  function addSong(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSongs(current => [
      ...current,
      {
        id: Date.now(),
        title: newTitle.trim(),
        artist: newArtist.trim() || "아티스트 미입력",
        type: "보컬",
        progress: 0,
      },
    ]);
    setNewTitle("");
    setNewArtist("");
    setShowForm(false);
  }

  function addPracticeLog(e) {
    e.preventDefault();
    const duration = Number(logMinutes);
    if (!Number.isFinite(duration) || duration < 1) return;

    const song = songs.find(s => String(s.id) === logSongId);

    const log = {
      id: Date.now(),
      date: new Date().toISOString(),
      minutes: duration,
      songTitle: song ? song.title : "",
      note: logNote.trim() || "연습 내용 미입력",
    };

    setLogs(current => [log, ...current]);
    setMinutes(current => current + duration);
    setLogNote("");
  }

  function deleteLog(id) {
    const target = logs.find(log => log.id === id);
    if (!target) return;
    setLogs(current => current.filter(log => log.id !== id));
    setMinutes(current => Math.max(0, current - target.minutes));
  }

  function addEvent(e) {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    const time = combineTime(eventHour, eventMinute);
    if (time === null) {
      setTimeError(true);
      return;
    }

    setEvents(current => [
      ...current,
      { id: Date.now(), date: selectedDate, time, title: eventTitle.trim(), memo: eventMemo.trim() },
    ]);
    setEventTitle("");
    setEventMemo("");
    setEventHour("");
    setEventMinute("");
    setOpenTimeList(null);
    setTimeError(false);
  }

  // 칸을 누르면 걸러지지 않은 목록 전체를 연다 (지금 값은 강조)
  function showTimeList(which) {
    setOpenTimeList(which);
    setTimeListFiltered(false);
  }

  function typeTime(which, text) {
    const digits = text.replace(/\D/g, "").slice(0, 2);
    if (which === "hour") {
      setEventHour(digits);
      if (digits.length === 2) {
        minuteInputRef.current?.focus();
        return;
      }
    } else {
      setEventMinute(digits);
    }
    setOpenTimeList(which);
    setTimeListFiltered(true);
  }

  function pickTime(which, value) {
    if (which === "hour") {
      setEventHour(value);
      if (!value) setEventMinute("");
    } else {
      setEventMinute(value);
    }
    setOpenTimeList(null);
    setTimeError(false);
  }

  function renderTimeList(which) {
    if (openTimeList !== which) return null;
    const value = which === "hour" ? eventHour : eventMinute;
    const allOptions = which === "hour" ? HOUR_OPTIONS : MINUTE_OPTIONS;
    const options = timeListFiltered ? filterOptions(allOptions, value) : allOptions;
    const showAllDay = which === "hour" && (!timeListFiltered || !value);
    if (options.length === 0 && !showAllDay) return null;
    const current = value ? value.padStart(2, "0") : "";

    return (
      <ul className="time-list" role="listbox">
        {/* onMouseDown preventDefault: 누르는 순간 칸의 포커스가 빠져 목록이 먼저 닫히지 않게 */}
        {showAllDay && (
          <li>
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => pickTime("hour", "")}>
              종일
            </button>
          </li>
        )}
        {options.map(option => (
          <li key={option}>
            <button
              type="button"
              className={option === current ? "active" : ""}
              ref={el => {
                if (option === current) el?.scrollIntoView({ block: "nearest" });
              }}
              onMouseDown={e => e.preventDefault()}
              onClick={() => pickTime(which, option)}
            >
              {option}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  function deleteEvent(id) {
    setEvents(current => current.filter(event => event.id !== id));
  }

  function moveMonth(offset) {
    setCalMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function goToday() {
    const d = new Date();
    setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelectedDate(dateKey(d));
  }

  // ---------- 통계 계산 ----------
  const minutesByDay = sumMinutesByDay(logs);

  const now = new Date();
  const todayKey = dateKey(now);
  const todayMinutes = minutesByDay[todayKey] || 0;

  const weekDays = getWeekDays(minutesByDay, now);

  const weekMinutes = weekDays.reduce((sum, day) => sum + day.minutes, 0);
  const weekPracticeDays = weekDays.filter(day => day.minutes > 0).length;
  const chartMax = Math.max(goal, ...weekDays.map(day => day.minutes), 1) * 1.15;

  const totalMinutes = logs.reduce((sum, log) => sum + log.minutes, 0);
  const practicedDays = Object.keys(minutesByDay).length;
  const averageMinutes = practicedDays ? Math.round(totalMinutes / practicedDays) : 0;

  const streak = calcStreak(minutesByDay, now);

  const songStats = rankSongs(logs);
  const maxSongTotal = songStats.length ? songStats[0].total : 1;

  // ---------- 캘린더 계산 ----------
  const calCells = getMonthGrid(calMonth.getFullYear(), calMonth.getMonth());
  const selectedEvents = sortEvents(events.filter(event => event.date === selectedDate));
  const upcoming = upcomingEvents(events, now);
  const nextEvent = upcoming[0];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">♪</div>
          <div>
            <strong>MUSELOG</strong>
            <span>YOUR MUSIC JOURNAL</span>
          </div>
        </div>

        <p className="nav-label">WORKSPACE</p>
        {TABS.map((tab, i) => (
          <button
            key={tab}
            className={`nav-item ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            <span>{TAB_ICONS[i]}</span>
            {tab}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="quote-mark">“</div>
          <p>Every little practice<br />makes a melody.</p>
          <span>YOUR JOURNEY, YOUR MUSIC.</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <span className="breadcrumb">Workspace / {activeTab}</span>
          <div className="profile">
            <div className="avatar">M</div>
            <span>My Studio</span>
          </div>
        </header>

        <section className="welcome">
          <div>
            <p className="eyebrow">{today.toUpperCase()} · MY MUSIC SPACE</p>
            <h1>음악이 쌓이는 시간,<br /><span>나만의 기록을 만들어 봐.</span></h1>
            <p className="welcome-sub">
              조금씩 연습하고, 어제보다 나아지는 나를 기록해 보세요.
            </p>
          </div>
          <div className="music-art" aria-hidden="true">
            <span className="art-circle circle-one" />
            <span className="art-circle circle-two" />
            <span className="art-note">♫</span>
          </div>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-heading">
              <span>오늘의 연습</span><span className="stat-icon">◷</span>
            </div>
            <div className="stat-number">{todayMinutes}<small> 분</small></div>
            <p>오늘 기록한 연습 시간</p>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${Math.min((todayMinutes / Math.max(goal, 1)) * 100, 100)}%` }}
              />
            </div>
            <div className="stat-foot">
              <span>목표 {goal}분</span>
              <span>{Math.min(Math.round((todayMinutes / Math.max(goal, 1)) * 100), 100)}% 달성</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-heading">
              <span>이번 주 연습</span><span className="stat-icon">♫</span>
            </div>
            <div className="stat-number">{weekMinutes}<small> 분</small></div>
            <p>이번 주에 쌓은 연습 시간</p>
            <div className="stat-foot standalone">
              <span>연습곡 {songs.length}곡</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-heading">
              <span>하루 목표</span><span className="stat-icon">◎</span>
            </div>
            <div className="stat-number">{goal}<small> 분</small></div>
            <p>나만의 하루 연습 목표</p>
            <div className="stat-foot standalone">
              <label className="goal-label">
                목표 시간
                <select value={goal} onChange={e => setGoal(Number(e.target.value))}>
                  <option value={30}>30분</option>
                  <option value={60}>60분</option>
                  <option value={90}>90분</option>
                  <option value={120}>120분</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        {activeTab === "연습 기록" ? (
          <>
            <section className="section-heading">
              <div>
                <p className="eyebrow">PRACTICE JOURNAL</p>
                <h2>오늘의 연습 기록</h2>
                <p className="section-sub">연습한 시간과 느낀 점을 기록해 봐.</p>
              </div>
            </section>

            <form className="song-form" onSubmit={addPracticeLog}>
              <select value={logSongId} onChange={e => setLogSongId(e.target.value)}>
                <option value="">자유 연습</option>
                {songs.map(song => (
                  <option key={song.id} value={song.id}>{song.title}</option>
                ))}
              </select>
              <select value={logMinutes} onChange={e => setLogMinutes(e.target.value)}>
                <option value="5">5분</option>
                <option value="15">15분</option>
                <option value="30">30분</option>
                <option value="45">45분</option>
                <option value="60">60분</option>
                <option value="90">90분</option>
                <option value="120">120분</option>
              </select>
              <input
                value={logNote}
                onChange={e => setLogNote(e.target.value)}
                placeholder="오늘 무엇을 연습했나요?"
              />
              <button className="primary-button" type="submit">기록 저장</button>
            </form>

            <div className="song-list">
              {logs.length === 0 ? (
                <div className="empty-state">
                  <span>◷</span>
                  <h3>아직 연습 기록이 없어요.</h3>
                  <p>첫 연습을 기록해 보세요.</p>
                </div>
              ) : logs.map(log => (
                <article className="song-card" key={log.id}>
                  <div className="song-cover cover-0">◷</div>
                  <div className="song-info">
                    <h3>
                      {log.songTitle ? `${log.songTitle} · ` : ""}{log.minutes}분 연습
                    </h3>
                    <p>{new Date(log.date).toLocaleString("ko-KR")}</p>
                    <p>{log.note}</p>
                  </div>
                  <button className="practice-button" onClick={() => deleteLog(log.id)}>
                    기록 삭제
                  </button>
                </article>
              ))}
            </div>
          </>
        ) : activeTab === "연습 통계" ? (
          <>
            <section className="section-heading">
              <div>
                <p className="eyebrow">PRACTICE INSIGHTS</p>
                <h2>연습 통계</h2>
                <p className="section-sub">쌓인 기록으로 나의 연습 흐름을 확인해 봐.</p>
              </div>
            </section>

            <section className="insight-grid">
              <div className="stat-card">
                <div className="stat-heading"><span>총 연습 시간</span></div>
                <div className="stat-number">{totalMinutes}<small> 분</small></div>
                <p>지금까지 기록한 전체 시간</p>
              </div>
              <div className="stat-card">
                <div className="stat-heading"><span>연속 연습</span></div>
                <div className="stat-number">{streak}<small> 일</small></div>
                <p>{streak > 0 ? "꾸준히 이어가는 중이에요" : "오늘 연습하면 시작돼요"}</p>
              </div>
              <div className="stat-card">
                <div className="stat-heading"><span>이번 주 연습한 날</span></div>
                <div className="stat-number">{weekPracticeDays}<small> / 7일</small></div>
                <p>이번 주 월요일부터 집계</p>
              </div>
              <div className="stat-card">
                <div className="stat-heading"><span>연습한 날 평균</span></div>
                <div className="stat-number">{averageMinutes}<small> 분</small></div>
                <p>연습한 날 기준 하루 평균</p>
              </div>
            </section>

            <section className="chart-card">
              <div className="chart-head">
                <h3>이번 주 연습 시간</h3>
                <span>총 {weekMinutes}분 · 목표 {goal}분</span>
              </div>
              <div className="week-chart-body">
                <div className="goal-line" style={{ bottom: `${(goal / chartMax) * 100}%` }}>
                  <span>목표 {goal}분</span>
                </div>
                <div className="week-bars">
                  {weekDays.map(day => (
                    <div className="bar-col" key={day.key}>
                      {day.minutes > 0 && <span className="bar-value">{day.minutes}</span>}
                      <div
                        className={`bar ${day.isToday ? "today" : ""} ${day.minutes === 0 ? "zero" : ""}`}
                        style={{ height: day.minutes > 0 ? `${(day.minutes / chartMax) * 100}%` : "4px" }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="week-labels">
                {weekDays.map(day => (
                  <span key={day.key} className={day.isToday ? "today" : ""}>{day.label}</span>
                ))}
              </div>
            </section>

            <section className="chart-card">
              <div className="chart-head">
                <h3>곡별 연습 시간</h3>
                <span>누적 기준</span>
              </div>
              {songStats.length === 0 ? (
                <p className="chart-empty">연습 기록을 남기면 곡별 통계가 보여요.</p>
              ) : (
                <div className="rank-list">
                  {songStats.map(item => (
                    <div className="rank-row" key={item.name}>
                      <span className="rank-name">{item.name}</span>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${(item.total / maxSongTotal) * 100}%` }}
                        />
                      </div>
                      <span className="rank-total">{item.total}분</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : activeTab === "캘린더" ? (
          <>
            <section className="section-heading">
              <div>
                <p className="eyebrow">MY SCHEDULE</p>
                <h2>캘린더</h2>
                <p className="section-sub">레슨, 공연 같은 일정을 적어 두고 D-DAY를 확인해 봐.</p>
              </div>
            </section>

            <section className="chart-card">
              <div className="cal-head">
                <button className="cal-nav" onClick={() => moveMonth(-1)} aria-label="이전 달">‹</button>
                <h3>{calMonth.getFullYear()}년 {calMonth.getMonth() + 1}월</h3>
                <button className="cal-nav" onClick={() => moveMonth(1)} aria-label="다음 달">›</button>
                <button className="cal-today-button" onClick={goToday}>오늘</button>
              </div>
              <div className="cal-grid">
                {CAL_WEEKDAYS.map(label => (
                  <span className="cal-weekday" key={label}>{label}</span>
                ))}
                {calCells.map((cell, i) => {
                  if (!cell) return <span className="cal-blank" key={`blank-${i}`} />;
                  const dayEvents = sortEvents(events.filter(event => event.date === cell.key));
                  return (
                    <button
                      key={cell.key}
                      className={`cal-day ${cell.key === todayKey ? "today" : ""} ${cell.key === selectedDate ? "selected" : ""}`}
                      onClick={() => setSelectedDate(cell.key)}
                    >
                      <span className="cal-date">{cell.day}</span>
                      {dayEvents.slice(0, 2).map(event => (
                        <span className="cal-event" key={event.id}>
                          {event.time ? `${event.time} ` : ""}{event.title}
                        </span>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="cal-more">+{dayEvents.length - 2}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="chart-card">
              <div className="chart-head">
                <h3>{formatDateLabel(selectedDate)} 일정 추가</h3>
              </div>
              <form className="song-form" onSubmit={addEvent}>
                <input
                  value={eventTitle}
                  onChange={e => setEventTitle(e.target.value)}
                  placeholder="일정 제목 (예: 레슨)"
                />
                <div className="time-field" role="group" aria-label="시간 (비우면 종일)">
                  {["hour", "minute"].map(which => (
                    <Fragment key={which}>
                      {which === "minute" && <span className="time-colon">:</span>}
                      <div className="time-combo">
                        <input
                          ref={which === "minute" ? minuteInputRef : null}
                          value={which === "hour" ? eventHour : eventMinute}
                          onChange={e => typeTime(which, e.target.value)}
                          onFocus={() => showTimeList(which)}
                          onClick={() => showTimeList(which)}
                          onBlur={() => setOpenTimeList(null)}
                          onKeyDown={e => e.key === "Escape" && setOpenTimeList(null)}
                          placeholder={which === "hour" ? "시" : "분"}
                          aria-label={which === "hour" ? "시" : "분"}
                          inputMode="numeric"
                          maxLength={2}
                          autoComplete="off"
                        />
                        {renderTimeList(which)}
                      </div>
                    </Fragment>
                  ))}
                </div>
                <input
                  value={eventMemo}
                  onChange={e => setEventMemo(e.target.value)}
                  placeholder="메모 (선택)"
                />
                <button className="primary-button" type="submit">일정 저장</button>
              </form>
              {timeError && <p className="time-error">시간을 확인해 주세요. (시 0~23, 분 0~59)</p>}
              {selectedEvents.length > 0 && (
                <div className="event-list">
                  {selectedEvents.map(event => (
                    <div className="event-row" key={event.id}>
                      <span className="dday-badge">{formatDday(calcDday(event.date, now))}</span>
                      <div className="event-info">
                        <strong><span className="event-time">{formatEventTime(event.time)}</span>{event.title}</strong>
                        {event.memo && <p>{event.memo}</p>}
                      </div>
                      <button className="practice-button" onClick={() => deleteEvent(event.id)}>
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="chart-card">
              <div className="chart-head">
                <h3>다가오는 일정</h3>
                <span>가까운 순 최대 5개</span>
              </div>
              {upcoming.length === 0 ? (
                <p className="chart-empty">다가오는 일정이 없어요.</p>
              ) : (
                <div className="event-list">
                  {upcoming.map(event => (
                    <div className="event-row" key={event.id}>
                      <span className="dday-badge">{formatDday(calcDday(event.date, now))}</span>
                      <div className="event-info">
                        <strong><span className="event-time">{formatEventTime(event.time)}</span>{event.title}</strong>
                        <p>{formatDateLabel(event.date)}{event.memo ? ` · ${event.memo}` : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            {activeTab === "대시보드" && (
              <section className="chart-card dday-card">
                <div className="chart-head">
                  <h3>다가오는 D-DAY</h3>
                  <button className="cal-today-button" onClick={() => setActiveTab("캘린더")}>
                    캘린더 열기
                  </button>
                </div>
                {nextEvent ? (
                  <div className="event-row">
                    <span className="dday-badge">{formatDday(calcDday(nextEvent.date, now))}</span>
                    <div className="event-info">
                      <strong>{nextEvent.title}</strong>
                      <p>{formatDateLabel(nextEvent.date)}{nextEvent.time ? ` ${nextEvent.time}` : ""}</p>
                    </div>
                  </div>
                ) : (
                  <p className="chart-empty">다가오는 일정이 없어요.</p>
                )}
              </section>
            )}

            <section className="section-heading">
              <div>
                <p className="eyebrow">YOUR REPERTOIRE</p>
                <h2>{activeTab === "내 연습곡" ? "나의 연습곡" : "오늘은 어떤 곡을 연습할까요?"}</h2>
                <p className="section-sub">한 곡씩 완성해 가는 나만의 음악 여정</p>
              </div>
              <button className="primary-button" onClick={() => setShowForm(!showForm)}>
                + 곡 추가하기
              </button>
            </section>

            {showForm && (
              <form className="song-form" onSubmit={addSong}>
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="곡 제목"
                  required
                />
                <input
                  value={newArtist}
                  onChange={e => setNewArtist(e.target.value)}
                  placeholder="아티스트"
                />
                <button className="primary-button" type="submit">곡 저장</button>
              </form>
            )}

            {songs.length === 0 ? (
              <div className="empty-state">
                <span>♫</span>
                <h3>첫 번째 연습곡을 추가해 보세요.</h3>
                <p>좋아하는 노래부터 시작하면 돼요.</p>
              </div>
            ) : (
              <div className="song-list">
                {songs.map((song, i) => (
                  <article className="song-card" key={song.id}>
                    <div className={`song-cover cover-${i % 4}`}>
                      {["♫", "♪", "♬", "♩"][i % 4]}
                    </div>
                    <div className="song-info">
                      <h3>{song.title}</h3>
                      <p>{song.artist} <span>·</span> {song.type}</p>
                      <div className="song-progress">
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${song.progress}%` }} />
                        </div>
                        <span>{song.progress}%</span>
                      </div>
                    </div>
                    <button
                      className="practice-button"
                      onClick={() => setSongs(current => current.map(s =>
                        s.id === song.id ? { ...s, progress: Math.min(s.progress + 10, 100) } : s
                      ))}
                    >
                      진도 +10%
                    </button>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        <footer className="footer">
          <span>MUSELOG © 2026</span>
          <span>MADE FOR THE LOVE OF MUSIC ♡</span>
        </footer>
      </main>
    </div>
  );
}

export default App;