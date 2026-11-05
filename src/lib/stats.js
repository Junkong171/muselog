// 연습 통계 계산 (순수 함수). "오늘"은 항상 인자로 받는다.

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

export function dateKey(value) {
  const d = new Date(value);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function sumMinutesByDay(logs) {
  const minutesByDay = {};
  logs.forEach(log => {
    const key = dateKey(log.date);
    minutesByDay[key] = (minutesByDay[key] || 0) + log.minutes;
  });
  return minutesByDay;
}

export function calcStreak(minutesByDay, today) {
  let streak = 0;
  const cursor = new Date(today);
  if (!minutesByDay[dateKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
  while (minutesByDay[dateKey(cursor)] > 0) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// 대시보드 배너의 연속 연습 문구. streak은 calcStreak의 결과다
export function streakMessage(streak, practicedToday) {
  if (practicedToday) return `${streak}일째 연습 중이에요. 오늘 연습 완료!`;
  if (streak > 0) return `${streak}일째 이어 가는 중이에요. 오늘 연습하면 ${streak + 1}일째!`;
  return "오늘 연습하면 1일째가 시작돼요.";
}

export function getWeekDays(minutesByDay, today) {
  const todayKey = dateKey(today);
  const weekStart = new Date(today);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

  return DAY_LABELS.map((label, i) => {
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
}

export function rankSongs(logs) {
  const songTotals = {};
  logs.forEach(log => {
    const name = log.songTitle || "자유 연습";
    songTotals[name] = (songTotals[name] || 0) + log.minutes;
  });
  return Object.entries(songTotals)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}
