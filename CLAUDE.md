# MUSELOG

음악 연습을 기록하는 웹앱. 연습곡 관리, 연습 기록, 주간/곡별 통계를 제공한다.

- React 19 + Vite, JavaScript (TypeScript 아님), 순수 CSS (UI 라이브러리 없음)
- 백엔드 없음: 모든 데이터는 브라우저 localStorage에 저장된다.

## 사용자 안내 방식

- 사용자는 코딩 초보자다. 항상 **한국어**로, 단계별로 설명한다.
- 무엇을 왜 바꾸는지 먼저 말하고, 어려운 용어에는 짧은 풀이를 붙인다.
- 사용자가 직접 해야 하는 일(브라우저에서 확인 등)은 순서대로 번호를 매겨 안내한다.

## 실행 명령어

- `npm run dev`: 개발 서버 실행 (브라우저에서 확인)
- `npm run build`: 배포용 빌드 (에러 확인용으로도 사용)
- `npm run lint`: 코드 검사 (oxlint)
- `npm test`: 자동 테스트 (Vitest)

## 폴더 구조

```
src/
  main.jsx    진입점
  App.jsx     앱 전체 (탭 6개: 대시보드 / 내 연습곡 / 연습 기록 / 연습 통계 / 캘린더 / 작업실)
  Metronome.jsx  작업실 탭의 메트로놈 (Web Audio API로 소리 재생)
  Routine.jsx    작업실 탭의 "오늘의 루틴" 카드 (매일 체크하는 고정 연습 목록)
  App.css     화면 스타일
  index.css   기본 스타일
  assets/     이미지
  lib/        순수 계산 함수와 테스트 (stats.js, calendar.js, songs.js, metronome.js, routine.js)
public/       파비콘, 아이콘
docs/         명세(specs/, 템플릿 _TEMPLATE.md), CHANGELOG.md
```

## localStorage 키

| 키 | 내용 |
|---|---|
| `muselog-songs` | 연습곡 배열 `[{ id, title, artist, type, progress }]` |
| `muselog-minutes` | 누적 연습 시간 (숫자, 분) |
| `muselog-goal` | 하루 목표 시간 (숫자, 분) |
| `muselog-logs` | 연습 기록 배열 `[{ id, date(ISO), minutes, songTitle, note }]` |
| `muselog-events` | 캘린더 일정 배열 `[{ id, date("YYYY-MM-DD"), time("HH:MM" 또는 "" = 종일), title, memo }]` |
| `muselog-song-sort` | 연습곡 정렬 기준 (문자열 `"added"` / `"title"` / `"progress"`, 없거나 깨지면 `"added"`) |
| `muselog-metronome` | 메트로놈 설정 `{ bpm(10~300), beats(2/3/4/6), accents(강조할 박 번호 배열, 1~6), subdivision(1~4, 리듬: ♩ ♫ 셋잇단음표 ♬) }` (없거나 깨진 항목은 기본값 120 / 4 / [1] / 1, 예전 `accent: true/false`는 `[1]` / `[]`로 읽음) |
| `muselog-routine` | 고정 연습 루틴 목록 `[{ id, title(1~40자) }]` (배열 순서 = 보이는 순서, 깨진 항목은 버림) |
| `muselog-routine-checks` | 오늘 체크한 루틴 `{ date("YYYY-MM-DD"), done: [id] }` (date가 오늘이 아니면 체크 없음으로 읽음) |

## 규칙

- 저장 데이터 구조를 바꾸면 **기존 사용자 데이터가 깨지지 않게 마이그레이션**한다.
  (예: `loadData`에서 옛 형식을 읽어 새 형식으로 바꿔 주고, 필드가 없으면 기본값을 넣는다.)
- 기존 기능을 망가뜨리지 않는다. 수정 후 다른 탭도 정상인지 확인한다.
- 파일 전체를 새로 쓰지 말고 **필요한 부분만** 수정한다.

## 금지 / 사용자 승인 필요

다음은 반드시 사용자에게 먼저 묻고 승인받은 뒤에만 한다.

- 작업은 새 브랜치에서 하고, main에는 직접 푸시하지 않는다.
- main 브랜치 푸시
- 배포 (vercel, netlify 등)
- 강제 푸시 (`git push --force`)
- 대량 삭제 (`rm -rf`, `Remove-Item -Recurse -Force` 등)
- `.env` 파일 수정

`.claude/hooks/`의 guard 스크립트가 위 명령 일부를 자동으로 차단한다. 막혔다고 우회하지 말고 사용자에게 물어본다.

## 작업 흐름

1. **명세 작성**: `/new-feature`로 `docs/specs/F-xxx-*.md`를 쓰고 한국어로 보여준다.
2. **사용자 승인**: 승인 전에는 코드를 수정하지 않는다.
3. **구현**: 필요한 부분만 수정한다.
4. **독립 검증**: `/verify-feature <명세>`로 tester 서브에이전트에 맡긴다. 명세 경로와 변경 내용만 넘기고(구현 대화는 넘기지 않음), 결과 원문을 보여준다. FAIL이 있으면 완료가 아니다.
5. **배포 승인**: 배포나 main 반영은 사용자가 승인한 경우에만 한다.
