# CHANGELOG

MUSELOG에서 한 일을 날짜순으로 기록한다. (최신이 위)

## 2026-10-30

### 기록 백업 내보내기 / 불러오기 (브랜치 `feature/data-backup`, 명세 `docs/specs/F-008-data-backup.md`)
- 상단 바에 "백업 내보내기"·"백업 불러오기" 버튼 (모든 탭)
- 내보내기: 9개 기록 키를 `muselog-backup-YYYY-MM-DD.json` 파일 하나로 내려받기. 형식 `{ app: "muselog", version: 1, exportedAt, data }`
- 불러오기: 확인 창에서 확인한 경우에만 백업 시점 그대로 바꾸고 새로고침(예전 형식도 기존 normalize 함수로 읽힘). 잘못된 파일·새 버전 파일은 안내만 하고 그대로. MUSELOG 밖의 키는 건드리지 않음
- 묶기/풀기 함수 `src/lib/backup.js` (`buildBackup`, `parseBackup`, `planRestore`), 테스트 11개 추가 (전체 96개). 나중에 로그인·서버 저장에서 같은 형식을 다시 씀
- 새 키를 만들면 `BACKUP_KEYS`에도 넣도록 CLAUDE.md에 적음
- 검증: tester PASS 9 / FAIL 0 / 확인 불가 4 → 파일 고르기 창은 사용자가 확인, 휴대폰 너비·불러오기 후 화면은 브라우저 확인. tester 제안대로 다운로드 주소를 늦게 지우고(Firefox·Safari 대비) 좁은 화면에서 버튼 줄바꿈 (2026-10-30)

### 연습곡 목적과 파트 (브랜치 `feature/song-purpose`, 명세 `docs/specs/F-007-song-purpose.md`)
- 곡 추가 폼에 파트 선택(보컬/기타/피아노/베이스/드럼/작곡/그 외, 기본 보컬)과 목적 칸(선택, 최대 30자, 예시: 공연·축가·레슨 과제·오디션·취미) 추가. 지금까지는 새 곡이 모두 보컬로 저장됐음
- 카드에 "아티스트 · 파트"와 "목적 · …" 배지 표시. "편집" 버튼으로 파트와 목적을 그 자리에서 함께 고침(Enter 저장, Esc 취소, 목적을 비우면 지움, 한 번에 한 카드)
- `muselog-songs` 곡마다 `purpose` 추가, `type`은 파트 목록으로 정리. 예전 곡은 `normalizeSongs`가 목적 ""·파트 그대로(없으면 보컬, 모르는 값은 그 외)로 읽음. 진행률·연습 기록은 그대로
- 편집 칸의 목적 입력에 화면을 다시 그릴 때마다 커서를 옮기던 문제를, 열릴 때 한 번만 커서를 두도록 수정
- 테스트 9개 추가 (`src/lib/songs.test.js`, 전체 85개)
- 검증: tester PASS 14 / FAIL 0 / 확인 불가 2 (예시 목록 표시, 다른 탭 화면은 브라우저 확인) (2026-10-30)

## 2026-10-26

### 고정 연습 루틴, 상단 날짜 (브랜치 `feature/daily-routine`, 명세 `docs/specs/F-006-daily-routine.md`)
- 작업실 맨 위(메트로놈 위)에 "오늘의 루틴" 카드: 항목 추가(Enter/추가, 최대 40자)·체크·× 삭제, "n / m 완료"와 진행 막대, 모두 하면 "오늘 루틴 완료!" (`src/Routine.jsx`)
- 루틴 목록은 계속 남고 체크는 그날에만 유효(날짜가 바뀌면 빈 칸으로 시작). 캘린더는 일정용으로 그대로
- 대시보드 D-DAY 위에 루틴 요약 카드: 항목 목록과 체크(대시보드에서도 체크 가능, 추가·삭제는 작업실에서만), "작업실 열기" 버튼
- 상단 바에 오늘 날짜를 모든 탭에서 표시. "음악이 쌓이는 시간" 배너는 대시보드에서만 보이고, 배너의 작은 제목은 "MY MUSIC SPACE"만
- 새 localStorage 키 `muselog-routine`(목록), `muselog-routine-checks`(오늘 체크). 기존 키는 변경 없음, 깨진 값은 빈 루틴·체크 없음으로 읽음 (`normalizeRoutine`, `todayChecks`)
- 계산 함수 `src/lib/routine.js` 분리, 테스트 13개 추가 (`src/lib/routine.test.js`, 전체 76개)
- 빠르게 여러 번 체크하면 마지막 것만 남던 문제를 직전 상태 기준 계산으로 수정
- 검증: tester PASS 19 / FAIL 0 / 확인 불가 1 → 화면은 사용자가 브라우저에서 확인 (2026-10-26)
- 기타: `.claude/settings.local.json`(이 컴퓨터 전용 Claude Code 설정)을 `.gitignore`에 추가

### 작업실 탭과 메트로놈 (브랜치 `feature/workroom-metronome`, 명세 `docs/specs/F-005-workroom-metronome.md`)
- 사이드바에 "작업실" 탭 추가(캘린더 다음). 음악 도구를 모으는 곳이고 첫 도구로 메트로놈 (`src/Metronome.jsx`)
- 메트로놈: 빠르기 "♩ = 120" 표시, 슬라이더·−/+·숫자 직접 입력(Enter로 적용, Esc로 취소), BPM 10~300. 박자 2/3/4/6박, 탭 템포(최근 4번 간격 평균)
- 박 버튼을 눌러 강조할 박을 고름(여러 개 또는 없음, 강조는 박의 첫 소리에만). 리듬 ♩ / ♫ / 셋잇단음표(악보 기호 그림) / ♬로 박 사이 작은 소리 추가
- 소리는 Web Audio API로 미리 예약해 재생(새 라이브러리 없음). 창이 뒤에 있어 타이머가 느려져도 박이 몰리지 않게 예약 거리를 늘림. 재생 중 설정 변경은 다음 박부터, 박자를 줄이면 1번 박부터
- 이번 연습 시간(분:초)을 곡과 함께 "연습 기록에 저장"(1분 이상, 메모에 BPM·박자·리듬). 연습 기록 탭과 같은 저장 함수(`recordPractice`)를 써서 대시보드·통계에 똑같이 반영
- 설정은 새 localStorage 키 `muselog-metronome` `{ bpm, beats, accents, subdivision }`. 없거나 깨진 항목은 기본값, 예전 `accent: true/false`는 `accents: [1]` / `[]`로 바꿔 읽음 (`normalizeMetronome`). 기존 키는 변경 없음
- 계산 함수 `src/lib/metronome.js` 분리, 테스트 22개 추가 (`src/lib/metronome.test.js`, 전체 63개)
- 검증: tester PASS 25 / FAIL 0 / 확인 불가 3 → 소리·화면은 사용자가 브라우저에서 확인 완료 (2026-10-26)

### 연습곡 목록 정렬 (브랜치 `feature/song-sort`, 명세 `docs/specs/F-004-song-sort.md`)
- 연습곡 목록 위에 정렬 선택 추가: 추가한 순(기본) / 제목순(가나다) / 진행률순(높은 순, 같으면 제목순)
- 보이는 순서만 바뀌고 저장 데이터(`muselog-songs`)는 그대로. 표지 그림은 곡을 따라감
- 고른 정렬 기준은 새 localStorage 키 `muselog-song-sort`에 저장되어 새로고침해도 유지. 기존 키는 변경 없음, 값이 없거나 깨지면 추가한 순 (`normalizeSongSort`)
- 정렬 함수 `src/lib/songs.js` 분리, 테스트 9개 추가 (`src/lib/songs.test.js`, 전체 41개)
- 검증: tester PASS 12 / FAIL 0, 브라우저 수동 확인 완료 (2026-10-26)

## 2026-10-25

### 캘린더 일정 시간 선택 (브랜치 `feature/calendar`, 명세 `docs/specs/F-003-event-time.md`)
- 일정 추가 시 시간 입력(선택): `[ 시 ] : [ 분 ]` 두 칸. 칸을 누르면 바로 숫자 입력(분은 1분 단위 가능)하고, 아래 선택 목록(시 00~23, 분 5분 단위)에서 고를 수도 있음. 친 숫자로 목록이 걸러짐 (`filterOptions`). 시 2자리 입력 시 분 칸으로 자동 이동
- 둘 다 비우면 "종일", 분을 비우면 정각. 잘못된 시간은 안내 문구 후 저장 안 함 (`combineTime`)
- 목록·달력 칸·대시보드 카드에 시간 표시
- 같은 날 일정은 종일 → 이른 시간 → 저장 순서로 정렬 (`sortEvents`)
- 데이터: `muselog-events` 항목에 `time: "HH:MM" | ""` 추가. 마이그레이션: time이 없거나 형식이 틀리면 `""`(종일)로 읽음
- 테스트 12개 추가 (전체 32개)
- 검증: tester PASS 16 / FAIL 0, 브라우저 수동 확인 완료 (2026-10-26)

### 캘린더와 D-DAY (브랜치 `feature/calendar`, 명세 `docs/specs/F-002-calendar.md`)
- "캘린더" 탭 추가: 월 달력(이전/다음 달, 오늘 버튼), 날짜별 일정(제목, 메모) 추가와 삭제
- D-DAY 표시: 오늘 "D-DAY", 앞으로 "D-n", 지난 일정 "D+n". "다가오는 일정" 목록(최대 5개)
- 대시보드에 "다가오는 D-DAY" 카드 추가 (가장 가까운 일정 1개, "캘린더 열기" 버튼)
- 새 localStorage 키 `muselog-events` (`[{ id, date: "YYYY-MM-DD", title, memo }]`). 기존 키는 변경 없음. 깨진 값은 빈 목록으로 처리
- 계산 함수 `src/lib/calendar.js` 분리, 테스트 10개 추가 (`src/lib/calendar.test.js`, 전체 20개)
- 검증: tester PASS 19 / FAIL 0, 브라우저 수동 확인 완료 (2026-10-25)

## 2026-10-23

### 하네스 2단계: 독립 검증 체계 (브랜치 `feature/tester-agent`)
- tester 서브에이전트 추가 (`.claude/agents/tester.md`): 읽기와 검사 명령만 할 수 있고 파일 수정 불가
- tester 전용 명령 허용 목록 hook 추가 (`.claude/hooks/guard-tester.js`)
- 명세 템플릿(`docs/specs/_TEMPLATE.md`)과 연습 통계 명세(`docs/specs/F-001-practice-stats.md`) 추가
- Skills 추가: `/new-feature` (명세 작성과 승인), `/verify-feature` (tester 검증)

### 통계 계산 분리와 자동 테스트 (`6372228`, PR #1 병합 `9822bc6`)
- 통계 계산을 `src/lib/stats.js` 순수 함수로 분리 (dateKey, sumMinutesByDay, calcStreak, getWeekDays, rankSongs)
- Vitest 설치, `npm test` 추가, 테스트 10개 (`src/lib/stats.test.js`)

### 하네스 1단계 (`d65e010`)
- `CLAUDE.md` 작성, 권한 설정(`.claude/settings.json`)
- 안전 hook 추가: `guard-bash.js` (위험 명령 차단), `guard-files.js` (보호 파일 수정 차단)

### 첫 저장 (`774be8b`)
- 대시보드 / 내 연습곡 / 연습 기록 / 연습 통계 탭까지 완성
