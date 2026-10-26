# CHANGELOG

MUSELOG에서 한 일을 날짜순으로 기록한다. (최신이 위)

## 2026-10-26

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
