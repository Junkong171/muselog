import { useEffect, useState } from "react";
import "./App.css";

const initialSongs = [
  { id: 1, title: "밤편지", artist: "아이유", type: "보컬", progress: 75 },
  { id: 2, title: "너를 생각해", artist: "주시크", type: "기타", progress: 45 },
  { id: 3, title: "사랑은 늘 도망가", artist: "임영웅", type: "보컬", progress: 30 },
];

const TABS = ["대시보드", "내 연습곡", "연습 기록", "연습 통계"];
const TAB_ICONS = ["⌂", "♫", "▤", "◔"];
const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function loadData(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function dateKey(value) {
  const d = new Date(value);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
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

  // ---------- 통계 계산 ----------
  const minutesByDay = {};
  logs.forEach(log => {
    const key = dateKey(log.date);
    minutesByDay[key] = (minutesByDay[key] || 0) + log.minutes;
  });

  const todayKey = dateKey(new Date());
  const todayMinutes = minutesByDay[todayKey] || 0;

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

  const weekDays = DAY_LABELS.map((label, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const key = dateKey(d);
    return {
      label,
      key,
      minutes: minutesByDay[key] || 0,
      isToday: key === todayKey,
    };
  });

  const weekMinutes = weekDays.reduce((sum, day) => sum + day.minutes, 0);
  const weekPracticeDays = weekDays.filter(day => day.minutes > 0).length;
  const chartMax = Math.max(goal, ...weekDays.map(day => day.minutes), 1) * 1.15;

  const totalMinutes = logs.reduce((sum, log) => sum + log.minutes, 0);
  const practicedDays = Object.keys(minutesByDay).length;
  const averageMinutes = practicedDays ? Math.round(totalMinutes / practicedDays) : 0;

  let streak = 0;
  const cursor = new Date();
  if (!minutesByDay[dateKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
  while (minutesByDay[dateKey(cursor)] > 0) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const songTotals = {};
  logs.forEach(log => {
    const name = log.songTitle || "자유 연습";
    songTotals[name] = (songTotals[name] || 0) + log.minutes;
  });
  const songStats = Object.entries(songTotals)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
  const maxSongTotal = songStats.length ? songStats[0].total : 1;

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
        ) : (
          <>
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