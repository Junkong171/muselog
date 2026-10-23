# CHANGELOG

MUSELOG에서 한 일을 날짜순으로 기록한다. (최신이 위)

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
