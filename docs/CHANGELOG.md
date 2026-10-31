# CHANGELOG

MUSELOG에서 한 일을 날짜순으로 기록한다. (최신이 위)

## 2026-10-31

### 회원 탈퇴 (브랜치 `feature/account-delete`, 명세 `docs/specs/F-014-account-delete.md`)
- 로그인 상태에서 프로필 옆 "회원 탈퇴" → 확인 창(되돌릴 수 없음, 이 기기 기록은 남음, 백업 내보내기, 카카오·구글 연결은 따로 끊기) → `탈퇴` 입력 시에만 "탈퇴하기"
- 성공: Supabase 함수 `delete_my_account`(본인 `auth.users`만 삭제, `user_data`는 cascade) 호출 → 이 브라우저 로그아웃, `muselog-sync-meta` 삭제, "탈퇴했어요" 안내. 다른 기록 키는 그대로. 실패: 창 안 안내, 자동 저장 상태는 누르기 전 그대로
- `docs/supabase/delete_account.sql` 추가 (사용자가 SQL Editor에서 실행함). 확인 창은 키가 작은 화면에서 창 안 스크롤
- 검증: tester PASS 7 / FAIL 0 / 확인 불가 2 → 실제 로그인·탈퇴·재로그인과 창 모양은 사용자가 카카오 테스트 계정으로 확인. tester 제안 2개(실패 시 자동 저장 상태 복원, 창 세로 스크롤) 반영 (2026-10-31)

### 작업실 튜너 (브랜치 `feature/tuner`, 명세 `docs/specs/F-013-tuner.md`)
- 작업실 메트로놈 아래 "튜너" 카드: 켜면 마이크 소리에서 음 이름(`A4 · 라`), 주파수(Hz), 센트 바늘(-50~+50), ±5센트 안이면 "맞음"(초록)·그 밖은 "낮음/높음"
- 소리가 나는 동안 40ms마다 다시 재어 바늘이 계속 따라 움직임(울리다 작아진 소리도 따라감). 소리가 멈추면 마지막 음을 1초 흐리게 보여 준 뒤 "소리를 내 보세요". 끄기·다른 탭으로 이동 시 마이크 끔. 거절·마이크 없음·미지원·오디오 준비 실패는 한국어 안내
- 음 높이 계산 `src/lib/tuner.js` (`detectPitch`: NSDF 방식, `frequencyToNote`, `tuningState`), 테스트 14개 추가 (전체 153개). 저장하는 값 없음
- 작업실 위쪽은 큰 카드 3개 대신 한 줄 요약(`오늘 N분 / 목표 M분 (P%)`, 진행 막대, `이번 주 W분`). 다른 탭은 그대로
- 검증: tester PASS 10 / FAIL 0 / 확인 불가 1 → 휴대폰 폭은 브라우저(375px)에서 확인. 가짜 마이크로 440Hz·낮은 E·A# 표시, 4초 동안 작아지는 소리에서 바늘이 끝까지 따라감, 끄기·탭 이동·거절 확인. tester 제안(오디오 준비 실패 시 마이크 끄기) 반영 (2026-10-31)

### 앱 로고(연습 노트 아이콘) 적용 (브랜치 `feature/app-logo`, 명세 `docs/specs/F-012-app-logo.md`)
- 카카오 앱 아이콘과 같은 시안 8번 그림을 `public/logo.svg`로 추가, 파비콘(`favicon.svg`, Vite 번개 → 로고)과 휴대폰 홈 화면 아이콘(`apple-touch-icon.png`)에도 사용
- 사이드바 맨 위 `♪` 자리와 로그인 전 프로필 "M" 자리에 로고 그림. 로그인 상태 프로필은 그대로
- 탭 제목 `MUSELOG`, `<html lang="ko">`
- 검증: tester PASS 7 / FAIL 0 / 확인 불가 1 → 휴대폰 폭(375px) 로고는 브라우저에서 확인 (2026-10-31)

### 연습곡 삭제, 사이드바 탭 순서 바꾸기 (브랜치 `feature/song-delete-tab-order`, 명세 `docs/specs/F-011-song-delete-tab-order.md`)
- 연습곡 카드에 "삭제"(확인 창 후 삭제). 연습 기록·통계는 그대로 남고 곡 선택 목록에서만 빠짐. 편집 중인 곡이면 편집 칸 닫힘
- 표지 그림을 곡 id로 정해(`songCoverIndex`) 다른 곡을 지우거나 정렬해도 그림이 그대로. 예시 곡 3개는 예전과 같은 그림
- 사이드바 탭을 마우스로 끌어다 놓아 순서 변경(놓일 자리에 보라색 선), 순서가 바뀌면 "기본 순서" 버튼
- 새 키 `muselog-tab-order`(`normalizeTabOrder`: 모르는 이름·중복 버림, 빠진 탭은 뒤에). `BACKUP_KEYS`에 넣어 백업·계정 동기화에도 포함(9개 → 10개, 백업 version 1 유지)
- `src/lib/tabs.js` (`normalizeTabOrder`, `moveTab`, `TAB_ICONS`), 테스트 14개 추가 (전체 139개), 코드 검사 경고 0개
- 검증: tester PASS 13 / FAIL 0 / 확인 불가 3 → 끌어다 놓기·탭 이동·백업 포함은 브라우저에서 확인. 로그인 상태 계정 저장은 사용자 확인 필요 (2026-10-31)
- 향후 계획 문서 `docs/ROADMAP.md` 추가 (구글 앱 게시·개인정보처리방침, 카카오 탈퇴 웹훅, 로고 교체, 작업실 도구 등)

### 로그인 2단계: 기록을 계정에 저장·불러오기 (브랜치 `feature/cloud-sync`, 명세 `docs/specs/F-010-cloud-sync.md`)
- 로그인하면 9개 키 묶음(백업 형식)을 Supabase 표 `user_data`에 저장하고, 다른 기기·브라우저에서 같은 계정으로 로그인하면 불러옴
- 처음 로그인: 계정이 비었으면 이 기기 기록을 올림, 이 기기가 비었으면 계정 기록을 불러옴, 둘 다 있으면 선택 창("계정 기록 불러오기 / 이 기기 기록으로 계정 덮어쓰기", 백업 내보내기 버튼 포함). 고르기 전엔 계정에 쓰지 않음
- 그 뒤: 기록이 바뀌면 2초 뒤 자동 저장, 상단 바에 "확인 중… / 저장 중… / 계정에 저장됨 / 저장 실패 · 다시 시도". 앱을 열 때 계정이 더 새것이면 불러오고, 두 기기가 따로 바뀌었으면 선택 창
- 판단은 순수 함수 `src/lib/sync.js` (`decideSync`, `isEmptyData`, `hashData`, `normalizeSyncMeta`). 새 키 `muselog-sync-meta` `{ userId, syncedAt, hash }`(백업에는 안 넣음). 저장 시각은 서버 시계(트리거)
- 보안: `docs/supabase/user_data.sql`로 표와 RLS(본인 줄만 읽기·만들기·고치기). 로그인 없이 읽으면 빈 목록, 쓰면 거절되는 것을 확인. 공개(anon) 키만 사용
- 예시 곡 목록을 `src/lib/songs.js`의 `INITIAL_SONGS`로 옮김. 로그인 창 안내 문구를 "기록이 계정에 자동 저장"으로 바꿈
- 테스트 20개 추가 (전체 125개), 코드 검사 경고 0개
- 검증: tester PASS 16 / FAIL 0 / 확인 불가 1(좁은 화면) → tester 제안대로 프로필 줄바꿈, 계정 바뀔 때 선택 창 초기화, 로그아웃 때 상태 초기화 반영. 사용자가 계정 저장(Table Editor), InPrivate 창에서 불러오기와 다른 창 반영을 확인. 선택 창과 오프라인 실패는 실제 화면으로는 아직 미확인 (2026-10-31)
- 배포: Vercel 환경 변수 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 등록(사용자)

### 로그인 1단계: 구글·카카오 (브랜치 `feature/login`, 명세 `docs/specs/F-009-login.md`)
- Supabase(로그인·데이터 보관 서비스)로 구글·카카오 로그인/로그아웃. 상단 바 "로그인" → 작은 창(구글/카카오 버튼), 로그인하면 이름 첫 글자·이름·"로그아웃"
- 로그인은 선택. 기록 저장 방식은 그대로(계정 저장은 F-010). 로그아웃해도 기록은 지우지 않음
- 이름은 구글 이름·카카오 닉네임 → 이메일 앞부분 → "사용자" (`displayName`). 로그인 취소·오류로 돌아오면 안내하고 주소창 정리 (`authErrorFromUrl`)
- 키가 없으면(`isAuthConfigured`) 로그인 버튼 없이 지금처럼 동작. 키는 `.env.local`(git 제외)과 Vercel 환경 변수에만, 저장소에는 이름만 적은 `.env.example`
- 새 라이브러리 `@supabase/supabase-js` 2.118.0 (사이트 파일 압축 기준 약 80KB → 137KB)
- 외부 설정(사용자): Supabase 프로젝트, Google Cloud OAuth 클라이언트(테스트 상태, 테스트 사용자 등록), 카카오 디벨로퍼스 앱(카카오 로그인 ON, 비즈 앱 전환, 동의항목 닉네임·프로필 사진·이메일, 리다이렉트 URI). 구글 게시는 개인정보처리방침 페이지가 생기면 진행
- 테스트 9개 추가 (`src/lib/auth.test.js`, 전체 105개)
- 검증: tester PASS 9 / FAIL 0 / 확인 불가 6 → 로그인·로그아웃은 사용자가 구글·카카오로 확인, 키 없는 빌드는 별도 확인. tester가 짚은 휴대폰 너비에서 로그인 창이 왼쪽 밖으로 나가는 문제를 고침 (2026-10-31)

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
