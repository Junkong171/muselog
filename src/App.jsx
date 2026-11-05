import { Fragment, useEffect, useRef, useState } from "react";
import "./App.css";
import { dateKey, sumMinutesByDay, calcStreak, streakMessage, getWeekDays, rankSongs } from "./lib/stats";
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
import {
  formatPeriodRange,
  MAX_PERIOD_MEMO_LENGTH,
  MAX_PERIOD_TITLE_LENGTH,
  normalizePeriods,
  periodsOnDate,
  sortPeriods,
} from "./lib/periods";
import {
  DEFAULT_PART,
  INITIAL_SONGS,
  MAX_PURPOSE_LENGTH,
  normalizeSongs,
  normalizeSongSort,
  PART_OPTIONS,
  PURPOSE_SUGGESTIONS,
  SONG_SORT_OPTIONS,
  songCoverIndex,
  sortSongs,
} from "./lib/songs";
import { normalizeMetronome } from "./lib/metronome";
import { normalizeIdeas } from "./lib/inspiration";
import Metronome from "./Metronome";
import { normalizeRoutine, routineProgress, todayChecks, toggleCheck } from "./lib/routine";
import Inspiration from "./Inspiration";
import Notebook from "./Notebook";
import PracticeTimer from "./PracticeTimer";
import Routine, { RoutineChecklist } from "./Routine";
import Tuner from "./Tuner";
import { backupFileName, buildBackup, parseBackup, planRestore } from "./lib/backup";
import { authErrorFromUrl, displayName } from "./lib/auth";
import { supabase } from "./lib/supabase";
import { decideSync, formatSummary, hashData, normalizeSyncMeta, summarizeData, SYNC_META_KEY } from "./lib/sync";
import { DEFAULT_TABS, isDefaultTabOrder, moveTab, normalizeTabOrder, TAB_ICONS } from "./lib/tabs";

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
  const [songs, setSongs] = useState(() => normalizeSongs(loadData("muselog-songs", INITIAL_SONGS)));
  const [minutes, setMinutes] = useState(() => loadData("muselog-minutes", 0));
  const [goal, setGoal] = useState(() => loadData("muselog-goal", 60));
  const [logs, setLogs] = useState(() => loadData("muselog-logs", []));
  const [timerActive, setTimerActive] = useState(false); // 연습 타이머가 재는 중인지 (메트로놈 시간 겹침 막기)
  const [newTitle, setNewTitle] = useState("");
  const [newArtist, setNewArtist] = useState("");
  const [newPart, setNewPart] = useState(DEFAULT_PART);
  const [newPurpose, setNewPurpose] = useState("");
  const [editingSongId, setEditingSongId] = useState(null); // 파트·목적을 고치는 중인 곡 (한 번에 하나)
  const [partDraft, setPartDraft] = useState(DEFAULT_PART);
  const [purposeDraft, setPurposeDraft] = useState("");
  const purposeInputRef = useRef(null);
  const backupInputRef = useRef(null);
  // 로그인 (Supabase 키가 없으면 supabase가 null이라 로그인 버튼 없이 지금처럼 동작)
  const [user, setUser] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginError, setLoginError] = useState(() => authErrorFromUrl(window.location.href).hasError);
  const loginBoxRef = useRef(null);
  // 계정 동기화: syncReady가 true가 되어야(처음 판단이 끝나야) 자동 저장을 시작한다
  const [syncStatus, setSyncStatus] = useState(null); // null | "checking" | "saving" | "saved" | "error"
  const [syncReady, setSyncReady] = useState(false);
  const [syncConflict, setSyncConflict] = useState(null); // { cloud, local } — 어느 기록을 쓸지 묻는 중
  // 회원 탈퇴 확인 창: "탈퇴"를 직접 써야 버튼이 눌린다
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [accountDeleted, setAccountDeleted] = useState(false);
  const userId = user?.id ?? null;
  const [showForm, setShowForm] = useState(false);
  const [songSort, setSongSort] = useState(() => normalizeSongSort(loadData("muselog-song-sort", "added")));
  const [activeTab, setActiveTab] = useState("대시보드");
  const [tabOrder, setTabOrder] = useState(() => normalizeTabOrder(loadData("muselog-tab-order", null)));
  const [dragFrom, setDragFrom] = useState(null); // 끌고 있는 탭의 순서 번호
  const [dropAt, setDropAt] = useState(null); // 놓일 자리 (이 번호의 탭 앞)
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
  const [periods, setPeriods] = useState(() => normalizePeriods(loadData("muselog-periods", [])));
  const [ideas, setIdeas] = useState(() => normalizeIdeas(loadData("muselog-ideas", [])));
  const [periodStart, setPeriodStart] = useState(null); // null = 달력에서 고른 날짜를 따라감
  const [periodEnd, setPeriodEnd] = useState(null);
  const [periodTitle, setPeriodTitle] = useState("");
  const [periodMemo, setPeriodMemo] = useState("");
  const [editingPeriodId, setEditingPeriodId] = useState(null);
  const [periodError, setPeriodError] = useState(false);
  const [metronome, setMetronome] = useState(() => normalizeMetronome(loadData("muselog-metronome", null)));
  const [routine, setRoutine] = useState(() => normalizeRoutine(loadData("muselog-routine", [])));
  // { date, done } 그대로 두고, 오늘 것인지는 화면을 그릴 때 todayChecks로 판단한다
  const [routineChecks, setRoutineChecks] = useState(() => loadData("muselog-routine-checks", null));
  const minuteInputRef = useRef(null);
  const periodTitleRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("muselog-songs", JSON.stringify(songs));
  }, [songs]);

  // 편집 칸이 열릴 때 한 번만 목적 칸에 커서를 둔다 (파트를 고르는 동안 커서를 뺏지 않게)
  useEffect(() => {
    if (editingSongId !== null) purposeInputRef.current?.focus();
  }, [editingSongId]);

  // ---------- 로그인 ----------
  // 로그인 실패로 돌아왔으면 주소창의 오류 글자를 지운다 (안내는 loginError로 보여 준다)
  useEffect(() => {
    const { hasError, cleanUrl } = authErrorFromUrl(window.location.href);
    if (hasError) window.history.replaceState(null, "", cleanUrl);
  }, []);

  // 브라우저에 남은 로그인 정보를 읽고, 로그인·로그아웃이 일어날 때마다 user를 바꾼다
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  // 회원 탈퇴 창: Esc를 누르면 닫힌다 (탈퇴하는 중에는 닫히지 않음)
  useEffect(() => {
    if (!deleteOpen || deleteBusy) return;
    const closeOnEsc = e => e.key === "Escape" && setDeleteOpen(false);
    document.addEventListener("keydown", closeOnEsc);
    return () => document.removeEventListener("keydown", closeOnEsc);
  }, [deleteOpen, deleteBusy]);

  // 로그인 창: 바깥을 누르거나 Esc를 누르면 닫힌다
  useEffect(() => {
    if (!loginOpen) return;
    const closeOnOutside = e => {
      if (loginBoxRef.current && !loginBoxRef.current.contains(e.target)) setLoginOpen(false);
    };
    const closeOnEsc = e => e.key === "Escape" && setLoginOpen(false);
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEsc);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEsc);
    };
  }, [loginOpen]);

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

  useEffect(() => {
    localStorage.setItem("muselog-periods", JSON.stringify(periods));
  }, [periods]);

  useEffect(() => {
    localStorage.setItem("muselog-ideas", JSON.stringify(ideas));
  }, [ideas]);

  useEffect(() => {
    localStorage.setItem("muselog-song-sort", JSON.stringify(songSort));
  }, [songSort]);

  useEffect(() => {
    localStorage.setItem("muselog-metronome", JSON.stringify(metronome));
  }, [metronome]);

  useEffect(() => {
    localStorage.setItem("muselog-routine", JSON.stringify(routine));
  }, [routine]);

  useEffect(() => {
    localStorage.setItem("muselog-routine-checks", JSON.stringify(routineChecks));
  }, [routineChecks]);

  useEffect(() => {
    localStorage.setItem("muselog-tab-order", JSON.stringify(tabOrder));
  }, [tabOrder]);

  // ---------- 계정 동기화 ----------
  // 로그인하면(또는 앱을 열 때 이미 로그인돼 있으면) 계정 기록과 비교해 올릴지·불러올지·물을지 정한다
  // (로그아웃하면 userId가 없어져 아래 자동 저장이 멈추고, 저장 상태·선택 창은 로그인했을 때만 보인다)
  useEffect(() => {
    if (!supabase || !userId) return;
    startSync(userId);
  }, [userId]);

  // 기록이 바뀌면 2초 뒤 계정에 저장한다. 위의 localStorage 저장 effect들 다음에 있어야 바뀐 값을 읽는다
  useEffect(() => {
    if (!supabase || !userId || !syncReady) return;
    const meta = normalizeSyncMeta(loadData(SYNC_META_KEY, null));
    if (meta.userId === userId && hashData(readLocalData()) === meta.hash) return;
    const timer = setTimeout(() => uploadLocal(userId), 2000); // 올리기 시작하면 "저장 중…"
    return () => clearTimeout(timer);
  }, [userId, syncReady, songs, minutes, goal, logs, events, periods, ideas, songSort, metronome, routine, routineChecks, tabOrder]);

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
        type: newPart,
        progress: 0,
        purpose: newPurpose.trim().slice(0, MAX_PURPOSE_LENGTH),
      },
    ]);
    setNewTitle("");
    setNewArtist("");
    setNewPart(DEFAULT_PART);
    setNewPurpose("");
    setShowForm(false);
  }

  // 곡만 지운다. 연습 기록에는 곡 제목이 글자로 저장되어 있어 기록·통계는 그대로 남는다
  function deleteSong(song) {
    if (!window.confirm(`'${song.title}' 곡을 삭제할까요? 이 곡으로 남긴 연습 기록은 그대로 남아요.`)) return;
    setSongs(current => current.filter(s => s.id !== song.id));
    if (editingSongId === song.id) setEditingSongId(null);
    if (logSongId === String(song.id)) setLogSongId("");
  }

  // 사이드바 탭 끌어다 놓기. 위쪽 절반에 놓으면 그 탭 앞, 아래쪽 절반이면 뒤 (가로 배치인 좁은 화면은 왼쪽/오른쪽)
  function dragOverTab(e, index) {
    if (dragFrom === null) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const horizontal = window.matchMedia("(max-width: 700px)").matches;
    const before = horizontal ? e.clientX < rect.left + rect.width / 2 : e.clientY < rect.top + rect.height / 2;
    setDropAt(before ? index : index + 1);
  }

  function dropTab(e) {
    e.preventDefault();
    if (dragFrom !== null && dropAt !== null) setTabOrder(current => moveTab(current, dragFrom, dropAt));
    setDragFrom(null);
    setDropAt(null);
  }

  function startSongEdit(song) {
    setEditingSongId(song.id);
    setPartDraft(song.type);
    setPurposeDraft(song.purpose);
  }

  // 파트와 목적을 함께 저장한다. 목적을 비운 채 저장하면 목적이 지워진다
  function saveSongEdit(e) {
    e.preventDefault();
    const purpose = purposeDraft.trim().slice(0, MAX_PURPOSE_LENGTH);
    setSongs(current => current.map(s => (s.id === editingSongId ? { ...s, type: partDraft, purpose } : s)));
    setEditingSongId(null);
  }

  // 연습 기록 탭, 작업실 메트로놈, 연습 타이머가 함께 쓰는 기록 저장
  function recordPractice(duration, songId, note) {
    const song = songs.find(s => String(s.id) === songId);

    const log = {
      id: Date.now(),
      date: new Date().toISOString(),
      minutes: duration,
      songTitle: song ? song.title : "",
      note,
    };

    setLogs(current => [log, ...current]);
    setMinutes(current => current + duration);
  }

  function addPracticeLog(e) {
    e.preventDefault();
    const duration = Number(logMinutes);
    if (!Number.isFinite(duration) || duration < 1) return;

    recordPractice(duration, logSongId, logNote.trim() || "연습 내용 미입력");
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

  function resetPeriodForm() {
    setPeriodStart(null);
    setPeriodEnd(null);
    setPeriodTitle("");
    setPeriodMemo("");
    setEditingPeriodId(null);
    setPeriodError(false);
  }

  function savePeriod(e) {
    e.preventDefault();
    // 빈 제목·빈 날짜는 걸러지고, 시작일과 끝일이 뒤집혔으면 바꿔 준다
    const [period] = normalizePeriods([{
      id: editingPeriodId ?? Date.now(),
      start: periodStart ?? selectedDate,
      end: periodEnd ?? selectedDate,
      title: periodTitle,
      memo: periodMemo,
    }]);
    if (!period) {
      setPeriodError(true);
      return;
    }
    setPeriods(current =>
      editingPeriodId === null
        ? [...current, period]
        : current.map(p => (p.id === editingPeriodId ? period : p)));
    resetPeriodForm();
  }

  function editPeriod(period) {
    setPeriodStart(period.start);
    setPeriodEnd(period.end);
    setPeriodTitle(period.title);
    setPeriodMemo(period.memo);
    setEditingPeriodId(period.id);
    setPeriodError(false);
    periodTitleRef.current?.focus();
  }

  function deletePeriod(period) {
    if (!window.confirm(`'${period.title}' 연습 기간을 삭제할까요?`)) return;
    setPeriods(current => current.filter(p => p.id !== period.id));
    if (editingPeriodId === period.id) resetPeriodForm();
  }

  function moveMonth(offset) {
    setCalMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function goToday() {
    const d = new Date();
    setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelectedDate(dateKey(d));
  }

  // ---------- 백업 ----------
  function exportBackup() {
    const now = new Date();
    const backup = buildBackup(key => localStorage.getItem(key), now);
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = backupFileName(now);
    link.click();
    // 바로 지우면 일부 브라우저(Firefox, Safari)에서 다운로드가 시작되기 전에 주소가 사라진다
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // 확인을 받은 뒤에만 기록을 바꾸고, 새로고침해서 앱이 처음부터 읽게 한다 (예전 형식도 normalize 함수를 거친다)
  async function importBackup(e) {
    const file = e.target.files[0];
    e.target.value = ""; // 같은 파일을 다시 골라도 동작하게
    if (!file) return;

    const result = parseBackup(await file.text());
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    const exportedAt = new Date(result.backup.exportedAt);
    const when = Number.isNaN(exportedAt.getTime()) ? "알 수 없음" : exportedAt.toLocaleString("ko-KR");
    if (!window.confirm(`지금 이 브라우저의 기록이 백업 파일 내용으로 바뀝니다. (백업 날짜: ${when})\n계속할까요?`)) return;

    const { set, remove } = planRestore(result.backup);
    set.forEach(([key, value]) => localStorage.setItem(key, value));
    remove.forEach(key => localStorage.removeItem(key));
    window.location.reload();
  }

  // 로그인 화면으로 갔다가 지금 주소로 돌아온다 (개발용이면 localhost, 배포 사이트면 배포 주소)
  async function login(provider) {
    setLoginError(false);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) setLoginError(true);
  }

  // 로그아웃해도 이 브라우저의 기록은 지우지 않는다 (자동 저장은 userId가 없어지면서 멈춘다)
  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setSyncReady(false);
    setSyncStatus(null);
    setSyncConflict(null);
  }

  function openDeleteAccount() {
    setDeleteText("");
    setDeleteError(false);
    setDeleteOpen(true);
  }

  function closeDeleteAccount() {
    if (!deleteBusy) setDeleteOpen(false);
  }

  // 계정과 계정 기록(user_data)을 지운다. 이 기기의 기록 키는 그대로 두고 동기화 정보만 지운다
  async function deleteAccount() {
    if (deleteBusy || deleteText !== "탈퇴") return;
    setDeleteBusy(true);
    setDeleteError(false);
    const wasSyncReady = syncReady;
    setSyncReady(false); // 지우는 동안 자동 저장이 다시 올리지 않게
    const { error } = await supabase.rpc("delete_my_account");
    if (error) {
      setDeleteBusy(false);
      setDeleteError(true);
      setSyncReady(wasSyncReady); // 실패하면 자동 저장을 누르기 전 상태 그대로
      return;
    }
    // 계정이 없어졌으니 서버에 묻지 않고 이 브라우저의 로그인 정보만 지운다
    await supabase.auth.signOut({ scope: "local" });
    localStorage.removeItem(SYNC_META_KEY);
    setUser(null);
    setSyncStatus(null);
    setSyncConflict(null);
    setDeleteBusy(false);
    setDeleteOpen(false);
    setAccountDeleted(true);
  }

  // 이 브라우저의 기록 키(BACKUP_KEYS) 묶음 안쪽
  function readLocalData() {
    return buildBackup(key => localStorage.getItem(key)).data;
  }

  function writeSyncMeta(meta) {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
  }

  // 계정 기록 읽기: 없으면 null, 형식이 깨졌어도 null(다음 저장 때 이 기기 기록으로 덮인다)
  async function fetchCloud(id) {
    const { data, error } = await supabase.from("user_data").select("data, updated_at").eq("user_id", id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const parsed = parseBackup(JSON.stringify(data.data));
    return parsed.ok ? { updatedAt: data.updated_at, data: parsed.backup.data, backup: parsed.backup } : null;
  }

  // 이 기기 기록을 계정에 올린다. 저장 시각은 서버가 정한다
  async function uploadLocal(id) {
    setSyncStatus("saving");
    const backup = buildBackup(key => localStorage.getItem(key));
    const { data, error } = await supabase
      .from("user_data")
      .upsert({ user_id: id, data: backup })
      .select("updated_at")
      .single();
    if (error) {
      setSyncStatus("error");
      return;
    }
    writeSyncMeta({ userId: id, syncedAt: data.updated_at, hash: hashData(backup.data) });
    setSyncStatus("saved");
    setSyncReady(true);
  }

  // 계정 기록으로 바꾼다: 백업 불러오기와 같은 길 (예전 형식도 새로고침 뒤 normalize 함수가 읽는다)
  function applyCloud(id, cloud) {
    writeSyncMeta({ userId: id, syncedAt: cloud.updatedAt, hash: hashData(cloud.data) });
    const { set, remove } = planRestore(cloud.backup);
    set.forEach(([key, value]) => localStorage.setItem(key, value));
    remove.forEach(key => localStorage.removeItem(key));
    window.location.reload();
  }

  async function startSync(id) {
    setSyncReady(false);
    setSyncConflict(null); // 앞 계정의 선택 창이 남아 있지 않게
    setSyncStatus("checking");
    let cloud;
    try {
      cloud = await fetchCloud(id);
    } catch {
      setSyncStatus("error");
      return;
    }
    const localData = readLocalData();
    const meta = normalizeSyncMeta(loadData(SYNC_META_KEY, null));
    const action = decideSync({ cloud, meta, userId: id, localData });
    if (action === "upload") {
      await uploadLocal(id);
    } else if (action === "download") {
      applyCloud(id, cloud);
    } else if (action === "ask") {
      setSyncStatus(null);
      setSyncConflict({ cloud, local: summarizeData(localData) });
    } else {
      writeSyncMeta({ userId: id, syncedAt: cloud.updatedAt, hash: hashData(localData) });
      setSyncStatus("saved");
      setSyncReady(true);
    }
  }

  // 처음 판단이 끝나기 전에 실패했으면 처음부터, 끝난 뒤면 지금 기록을 다시 올린다
  function retrySync() {
    if (syncReady) uploadLocal(userId);
    else startSync(userId);
  }

  async function resolveConflict(choice) {
    const { cloud } = syncConflict;
    setSyncConflict(null);
    if (choice === "download") applyCloud(userId, cloud);
    else await uploadLocal(userId);
  }

  function addRoutineItem(title) {
    setRoutine(current => [...current, { id: Date.now(), title }]);
  }

  function deleteRoutineItem(id) {
    setRoutine(current => current.filter(item => item.id !== id));
  }

  // 체크는 오늘 날짜로 저장한다. 어제 체크가 남아 있으면 todayChecks가 비워서 새로 시작한다
  function toggleRoutineCheck(id) {
    const key = dateKey(new Date());
    // 빠르게 여러 번 눌러도 체크가 빠지지 않도록 직전 상태(current)에서 계산한다
    setRoutineChecks(current => ({ date: key, done: toggleCheck(todayChecks(current, key, routine), id) }));
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
  const selectedPeriods = periodsOnDate(periods, selectedDate);
  const upcoming = upcomingEvents(events, now);
  const nextEvent = upcoming[0];

  // ---------- 루틴 계산 ----------
  const routineDone = todayChecks(routineChecks, todayKey, routine);
  const routineStatus = routineProgress(routine, routineDone);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-icon" src="/logo.svg" alt="" />
          <div>
            <strong>MUSELOG</strong>
            <span>YOUR MUSIC JOURNAL</span>
          </div>
        </div>

        <p className="nav-label">
          WORKSPACE
          {!isDefaultTabOrder(tabOrder) && (
            <button className="nav-reset" onClick={() => setTabOrder([...DEFAULT_TABS])}>기본 순서</button>
          )}
        </p>
        {tabOrder.map((tab, i) => (
          <button
            key={tab}
            className={[
              "nav-item",
              activeTab === tab ? "active" : "",
              dragFrom === i ? "dragging" : "",
              dragFrom !== null && dropAt === i && dropAt !== dragFrom && dropAt !== dragFrom + 1 ? "drop-before" : "",
              dragFrom !== null && dropAt === i + 1 && i === tabOrder.length - 1 && dropAt !== dragFrom + 1 ? "drop-after" : "",
            ].join(" ")}
            onClick={() => setActiveTab(tab)}
            draggable
            onDragStart={e => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", tab);
              setDragFrom(i);
            }}
            onDragOver={e => dragOverTab(e, i)}
            onDrop={dropTab}
            onDragEnd={() => {
              setDragFrom(null);
              setDropAt(null);
            }}
            title="끌어서 순서를 바꿀 수 있어요"
          >
            <span>{TAB_ICONS[tab]}</span>
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
          <div className="topbar-left">
            <span className="breadcrumb">Workspace / {activeTab}</span>
            <span className="topbar-date">{today}</span>
          </div>
          <div className="topbar-right">
            <div className="backup-actions">
              <button className="cal-today-button" onClick={exportBackup}>백업 내보내기</button>
              <button className="cal-today-button" onClick={() => backupInputRef.current?.click()}>백업 불러오기</button>
              <input
                ref={backupInputRef}
                type="file"
                accept=".json,application/json"
                onChange={importBackup}
                hidden
              />
            </div>
            {user ? (
              <div className="profile">
                <div className="avatar">{displayName(user).charAt(0)}</div>
                <span>{displayName(user)}</span>
                {syncStatus === "error" ? (
                  <button className="sync-status error" onClick={retrySync}>저장 실패 · 다시 시도</button>
                ) : (
                  syncStatus && (
                    <span className="sync-status" role="status">
                      {{ checking: "확인 중…", saving: "저장 중…", saved: "계정에 저장됨" }[syncStatus]}
                    </span>
                  )
                )}
                <button className="cal-today-button" onClick={logout}>로그아웃</button>
                <button className="purpose-text-button danger" onClick={openDeleteAccount}>회원 탈퇴</button>
              </div>
            ) : (
              <div className="profile login-anchor" ref={loginBoxRef}>
                <img className="avatar avatar-logo" src="/logo.svg" alt="" />
                <span>My Studio</span>
                {supabase && (
                  <button
                    className="cal-today-button"
                    onClick={() => setLoginOpen(open => !open)}
                    aria-expanded={loginOpen}
                  >
                    로그인
                  </button>
                )}
                {loginOpen && (
                  <div className="login-popover" role="dialog" aria-label="로그인">
                    <button className="login-provider google" onClick={() => login("google")}>구글로 로그인</button>
                    <button className="login-provider kakao" onClick={() => login("kakao")}>카카오로 로그인</button>
                    <p>
                      로그인하면 기록이 계정에 자동 저장되고, 다른 기기에서도 같은 기록을 볼 수 있어요.
                      로그인하지 않아도 지금처럼 쓸 수 있어요.
                    </p>
                    <a className="login-privacy" href="/privacy.html" target="_blank" rel="noreferrer">개인정보처리방침</a>
                    <button className="purpose-text-button" onClick={() => setLoginOpen(false)}>닫기</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <PracticeTimer songs={songs} onSave={recordPractice} onActiveChange={setTimerActive} />

        {loginError && (
          <p className="login-error" role="alert">
            로그인하지 못했어요. 다시 시도해 주세요.
            <button className="purpose-text-button" onClick={() => setLoginError(false)}>닫기</button>
          </p>
        )}

        {accountDeleted && (
          <p className="account-notice" role="status">
            탈퇴했어요. 이 기기의 기록은 그대로 있어요.
            <button className="purpose-text-button" onClick={() => setAccountDeleted(false)}>닫기</button>
          </p>
        )}

        {user && deleteOpen && (
          <div className="sync-overlay" onMouseDown={e => e.target === e.currentTarget && closeDeleteAccount()}>
            <div className="sync-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title">
              <h3 id="delete-title">회원 탈퇴</h3>
              <ul className="delete-facts">
                <li><strong>계정과 계정에 저장된 기록이 지워지고, 되돌릴 수 없어요.</strong></li>
                <li>이 기기(브라우저)의 기록은 그대로 남아요. 로그인하지 않고 지금처럼 쓸 수 있어요.</li>
                <li>카카오·구글 쪽 연결은 각 서비스의 계정 설정(연결된 앱)에서 따로 끊을 수 있어요.</li>
              </ul>
              <p className="sync-hint">
                지우기 전에 기록을 파일로 받아 두려면 "백업 내보내기"를 누르세요.
                <button className="cal-today-button" onClick={exportBackup}>백업 내보내기</button>
              </p>
              <label className="delete-confirm">
                계속하려면 아래 칸에 <strong>탈퇴</strong>라고 써 주세요.
                <input
                  value={deleteText}
                  onChange={e => setDeleteText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && deleteAccount()}
                  placeholder="탈퇴"
                  disabled={deleteBusy}
                  autoFocus
                />
              </label>
              {deleteError && (
                <p className="delete-error" role="alert">탈퇴하지 못했어요. 잠시 뒤 다시 시도해 주세요.</p>
              )}
              <div className="sync-actions">
                <button className="practice-button" onClick={closeDeleteAccount} disabled={deleteBusy}>취소</button>
                <button
                  className="primary-button danger-button"
                  onClick={deleteAccount}
                  disabled={deleteBusy || deleteText !== "탈퇴"}
                >
                  {deleteBusy ? "탈퇴하는 중…" : "탈퇴하기"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 계정과 이 기기에 서로 다른 기록이 있을 때: 고르기 전에는 계정에 아무것도 저장하지 않는다 */}
        {user && syncConflict && (
          <div className="sync-overlay">
            <div className="sync-dialog" role="dialog" aria-modal="true" aria-labelledby="sync-title">
              <h3 id="sync-title">계정과 이 기기의 기록이 달라요</h3>
              <p>어느 기록을 쓸지 골라 주세요. 고르기 전에는 계정에 아무것도 저장하지 않아요.</p>
              <div className="sync-compare">
                <div>
                  <strong>계정 기록</strong>
                  <span>마지막 저장 {new Date(syncConflict.cloud.updatedAt).toLocaleString("ko-KR")}</span>
                  <span>
                    {formatSummary(summarizeData(syncConflict.cloud.data))}
                  </span>
                </div>
                <div>
                  <strong>이 기기 기록</strong>
                  <span>{formatSummary(syncConflict.local)}</span>
                </div>
              </div>
              <p className="sync-hint">
                지금 이 기기 기록을 백업 파일로 받아 두려면 먼저 "백업 내보내기"를 누르세요.
                <button className="cal-today-button" onClick={exportBackup}>백업 내보내기</button>
              </p>
              <div className="sync-actions">
                <button className="primary-button" onClick={() => resolveConflict("download")}>계정 기록 불러오기</button>
                <button className="practice-button" onClick={() => resolveConflict("upload")}>이 기기 기록으로 계정 덮어쓰기</button>
              </div>
            </div>
          </div>
        )}

        {/* 배너는 대시보드에서만. 날짜는 위 상단 바에 항상 보인다 */}
        {activeTab === "대시보드" && (
          <section className="welcome">
            <div>
              <p className="eyebrow">MY MUSIC SPACE</p>
              <h1>음악이 쌓이는 시간,<br /><span>나만의 기록을 만들어 봐.</span></h1>
              <p className="welcome-sub">
                조금씩 연습하고, 어제보다 나아지는 나를 기록해 보세요.
              </p>
              <p className="welcome-streak">{streakMessage(streak, todayMinutes > 0)}</p>
            </div>
            <div className="music-art" aria-hidden="true">
              <span className="art-circle circle-one" />
              <span className="art-circle circle-two" />
              <span className="art-note">♫</span>
            </div>
          </section>
        )}

        {/* 작업실·영감·수첩에서는 내용이 바로 보이도록 큰 카드 대신 한 줄 요약 */}
        {["작업실", "영감", "수첩"].includes(activeTab) ? (
        <section className="stats-strip" aria-label="연습 요약">
          <span>오늘 <strong>{todayMinutes}분</strong> / 목표 {goal}분 ({Math.min(Math.round((todayMinutes / Math.max(goal, 1)) * 100), 100)}%)</span>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${Math.min((todayMinutes / Math.max(goal, 1)) * 100, 100)}%` }}
            />
          </div>
          <span>이번 주 <strong>{weekMinutes}분</strong></span>
        </section>
        ) : (
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
        )}

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
                  const dayPeriods = periodsOnDate(periods, cell.key);
                  return (
                    <button
                      key={cell.key}
                      className={`cal-day ${cell.key === todayKey ? "today" : ""} ${cell.key === selectedDate ? "selected" : ""}`}
                      onClick={() => setSelectedDate(cell.key)}
                    >
                      <span className="cal-date">{cell.day}</span>
                      {dayPeriods.slice(0, 2).map(period => (
                        <span className="cal-period" key={period.id} title={period.title}>
                          {(cell.key === period.start || cell.day === 1) && period.title}
                        </span>
                      ))}
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
              {selectedPeriods.length > 0 && (
                <div className="event-list">
                  <p className="period-day-head">이 날의 연습 기간</p>
                  {selectedPeriods.map(period => (
                    <div className="event-row period-row" key={period.id}>
                      <div className="event-info">
                        <strong>{period.title}</strong>
                        <p>{formatPeriodRange(period)}</p>
                        {period.memo && <p className="period-memo">{period.memo}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                <h3>연습 기간 메모</h3>
                <span>언제 무엇을 중점으로 연습했는지</span>
              </div>
              <form className="song-form" onSubmit={savePeriod}>
                <label className="period-date">
                  시작일
                  <input
                    type="date"
                    value={periodStart ?? selectedDate}
                    onChange={e => setPeriodStart(e.target.value)}
                  />
                </label>
                <label className="period-date">
                  끝일
                  <input
                    type="date"
                    value={periodEnd ?? selectedDate}
                    onChange={e => setPeriodEnd(e.target.value)}
                  />
                </label>
                <input
                  ref={periodTitleRef}
                  value={periodTitle}
                  onChange={e => setPeriodTitle(e.target.value)}
                  placeholder="중점 연습 (예: 기타 코드 전환)"
                  aria-label="중점 연습"
                  maxLength={MAX_PERIOD_TITLE_LENGTH}
                />
                <input
                  value={periodMemo}
                  onChange={e => setPeriodMemo(e.target.value)}
                  placeholder="메모 (선택)"
                  aria-label="메모"
                  maxLength={MAX_PERIOD_MEMO_LENGTH}
                />
                <button className="primary-button" type="submit">
                  {editingPeriodId === null ? "기간 저장" : "수정 저장"}
                </button>
                {editingPeriodId !== null && (
                  <button className="practice-button" type="button" onClick={resetPeriodForm}>취소</button>
                )}
              </form>
              {periodError && <p className="time-error">중점 연습과 시작일·끝일을 모두 적어 주세요.</p>}
              {periods.length === 0 ? (
                <p className="chart-empty">아직 적어 둔 연습 기간이 없어요.</p>
              ) : (
                <div className="event-list">
                  {sortPeriods(periods).map(period => (
                    <div className="event-row period-row" key={period.id}>
                      <div className="event-info">
                        <strong>{period.title}</strong>
                        <p>{formatPeriodRange(period)}</p>
                        {period.memo && <p className="period-memo">{period.memo}</p>}
                      </div>
                      <button className="practice-button" onClick={() => editPeriod(period)}>수정</button>
                      <button className="practice-button" onClick={() => deletePeriod(period)}>삭제</button>
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
        ) : activeTab === "영감" ? (
          <Inspiration
            ideaCount={ideas.length}
            onChangeIdeas={setIdeas}
            onOpenNotebook={() => setActiveTab("수첩")}
          />
        ) : activeTab === "수첩" ? (
          <Notebook ideas={ideas} onChangeIdeas={setIdeas} onOpenInspiration={() => setActiveTab("영감")} />
        ) : activeTab === "작업실" ? (
          <>
            <section className="section-heading">
              <div>
                <p className="eyebrow">MUSIC TOOLS</p>
                <h2>작업실</h2>
                <p className="section-sub">연습에 필요한 도구를 꺼내 써 봐.</p>
              </div>
            </section>

            <Routine
              items={routine}
              done={routineDone}
              onAdd={addRoutineItem}
              onToggle={toggleRoutineCheck}
              onDelete={deleteRoutineItem}
            />

            <Metronome
              settings={metronome}
              onChangeSettings={setMetronome}
              songs={songs}
              onSaveLog={recordPractice}
              timerActive={timerActive}
            />
            <Tuner />
          </>
        ) : (
          <>
            {activeTab === "대시보드" && (
              <section className="chart-card routine-summary">
                <div className="chart-head">
                  <h3>오늘의 루틴</h3>
                  <button className="cal-today-button" onClick={() => setActiveTab("작업실")}>
                    작업실 열기
                  </button>
                </div>
                {routineStatus.total === 0 ? (
                  <p className="chart-empty">아직 루틴이 없어요.</p>
                ) : (
                  <>
                    <div className="routine-summary-count">
                      <strong>{routineStatus.done} / {routineStatus.total} 완료</strong>
                      {routineStatus.complete && <span className="routine-complete">오늘 루틴 완료!</span>}
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${(routineStatus.done / routineStatus.total) * 100}%` }}
                      />
                    </div>
                    {/* 추가·삭제는 작업실에서만, 여기서는 체크만 */}
                    <RoutineChecklist items={routine} done={routineDone} onToggle={toggleRoutineCheck} />
                  </>
                )}
              </section>
            )}

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
                <select value={newPart} onChange={e => setNewPart(e.target.value)} aria-label="파트">
                  {PART_OPTIONS.map(part => <option key={part} value={part}>{part}</option>)}
                </select>
                <input
                  value={newPurpose}
                  onChange={e => setNewPurpose(e.target.value)}
                  placeholder="목적 (선택, 예: 축가)"
                  list="purpose-suggestions"
                  maxLength={MAX_PURPOSE_LENGTH}
                  aria-label="목적 (선택)"
                />
                <button className="primary-button" type="submit">곡 저장</button>
              </form>
            )}

            {/* 곡 추가 칸과 카드의 목적 고치기 칸이 함께 쓰는 예시 목록 */}
            <datalist id="purpose-suggestions">
              {PURPOSE_SUGGESTIONS.map(purpose => <option key={purpose} value={purpose} />)}
            </datalist>

            {songs.length === 0 ? (
              <div className="empty-state">
                <span>♫</span>
                <h3>첫 번째 연습곡을 추가해 보세요.</h3>
                <p>좋아하는 노래부터 시작하면 돼요.</p>
              </div>
            ) : (
              <>
                <div className="song-sort">
                  <label>
                    정렬
                    <select value={songSort} onChange={e => setSongSort(e.target.value)}>
                      {SONG_SORT_OPTIONS.map(option => (
                        <option key={option.key} value={option.key}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="song-list">
                  {sortSongs(songs, songSort).map(song => {
                    // 표지는 곡의 id로 정해 두어 정렬을 바꾸거나 다른 곡을 지워도 곡을 따라간다
                    const cover = songCoverIndex(song.id);
                    return (
                      <article className="song-card" key={song.id}>
                        <div className={`song-cover cover-${cover}`}>
                          {["♫", "♪", "♬", "♩"][cover]}
                        </div>
                        <div className="song-info">
                          <h3>{song.title}</h3>
                          <p>{song.artist} <span>·</span> {song.type}</p>
                          {editingSongId === song.id ? (
                            <form className="purpose-edit" onSubmit={saveSongEdit}>
                              <select
                                value={partDraft}
                                onChange={e => setPartDraft(e.target.value)}
                                onKeyDown={e => e.key === "Escape" && setEditingSongId(null)}
                                aria-label={`${song.title} 파트`}
                              >
                                {PART_OPTIONS.map(part => <option key={part} value={part}>{part}</option>)}
                              </select>
                              <input
                                ref={purposeInputRef}
                                value={purposeDraft}
                                onChange={e => setPurposeDraft(e.target.value)}
                                onKeyDown={e => e.key === "Escape" && setEditingSongId(null)}
                                placeholder="목적 (비우면 지워져요)"
                                list="purpose-suggestions"
                                maxLength={MAX_PURPOSE_LENGTH}
                                aria-label={`${song.title} 목적`}
                              />
                              <button type="submit" className="purpose-save">저장</button>
                              <button type="button" className="purpose-text-button" onClick={() => setEditingSongId(null)}>
                                취소
                              </button>
                            </form>
                          ) : (
                            <div className="song-purpose">
                              {song.purpose && <span className="purpose-badge">목적 · {song.purpose}</span>}
                              <button className="purpose-text-button" onClick={() => startSongEdit(song)}>
                                편집
                              </button>
                              <button className="purpose-text-button danger" onClick={() => deleteSong(song)}>
                                삭제
                              </button>
                            </div>
                          )}
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
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        <footer className="footer">
          <span>
            MUSELOG © 2026 ·{" "}
            <a className="footer-link" href="/privacy.html" target="_blank" rel="noreferrer">개인정보처리방침</a>
          </span>
          <span>MADE FOR THE LOVE OF MUSIC ♡</span>
        </footer>
      </main>
    </div>
  );
}

export default App;