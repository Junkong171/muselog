# F-026: 개인정보처리방침 최신화와 출처·라이선스 표시

- 상태: 구현됨
- 작성일: 2026-11-06
- 관련 파일: `public/privacy.html`, 새 파일 `public/licenses.html`, `src/App.jsx`(바닥글 링크), `src/Notebook.jsx`(음원 출처 한 줄), `src/lib/pwa.test.js` 또는 새 테스트, `CLAUDE.md`, 지울 파일 `public/icons.svg`, `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg`

## 목적

지금까지 만든 기능(F-001~F-025)에 맞게 개인정보처리방침에 빠진 내용을 채우고, 앱이 가져다 쓴 외부 자료(음원, 글꼴, 오픈소스 코드)의 출처와 라이선스를 한곳에 표시한다.

### 점검에서 찾은 것 (2026-11-06)

| # | 무엇 | 지금 상태 | 문제 |
|---|---|---|---|
| 1 | 오픈소스 코드 (React, Supabase 등 12개, 모두 MIT·0BSD) | 배포한 앱 파일에 저작권·라이선스 문구가 하나도 없음 (`dist/assets/*.js`에서 "MIT" 0번) | MIT 라이선스는 "저작권 표시와 라이선스 문구를 함께 넣을 것"을 조건으로 함 |
| 2 | 글꼴 DM Sans, Noto Sans KR (Google Fonts, SIL OFL 1.1) | 표시 없음 | 표시 의무는 없지만 출처 목록에 함께 적는 것이 좋음 |
| 3 | 악기 음원 FluidR3 GM (CC BY 3.0) | 영감 탭에만 표시 | 수첩 탭도 같은 음원을 재생하는데 표시 없음 |
| 4 | 방침 8번 "지우기 전에 백업 내보내기" | 음성 메모는 백업에 안 들어감 | 사이트 데이터를 지우면 녹음은 되살릴 수 없다는 안내가 없음 |
| 5 | 방침 8번 지우는 방법 | 엣지·크롬·사파리만 | 삼성 인터넷, 홈 화면에 설치한 앱의 경우가 없음 |
| 6 | 방침 8번 저장 공간 | localStorage, IndexedDB만 | 인터넷 없이 열기(F-023)용 저장 공간(Cache Storage: 앱 파일·악기 음원, 개인정보 아님)이 빠짐 |
| 7 | 방침 9번 열람·내보내기 | 음성 메모 언급 없음 | 녹음은 수첩에서 듣고 지울 수 있고, 백업 파일에는 들어가지 않는다는 내용이 없음 |
| 8 | `public/icons.svg` | 처음 프로젝트를 만들 때 따라온 견본 파일. 쓰지 않지만 배포되어 누구나 열 수 있음 | 다른 회사 로고(Bluesky, Discord, GitHub, X)가 들어 있음 |
| 9 | `src/assets/hero.png`, `react.svg`, `vite.svg` | 처음 견본 파일, 쓰지 않음 (배포에는 안 들어감) | 정리 대상 |

## 사용자 시나리오

1. 앱 맨 아래 바닥글에 "개인정보처리방침" 옆에 **"출처·라이선스"** 링크가 보인다.
2. 누르면 새 창으로 `licenses.html`이 열리고, 음원·글꼴·오픈소스 코드의 이름, 만든 곳, 라이선스와 라이선스 전문이 보인다.
3. 개인정보처리방침 8·9번에 음성 메모, 인터넷 없이 열기 저장 공간, 삼성 인터넷·설치 앱에서 지우는 방법이 보인다.

## 수용 기준

- [ ] AC-1: `public/licenses.html`이 있고, 앱 바닥글의 "개인정보처리방침" 옆 **"출처·라이선스"** 링크로 새 창에서 열린다.
- [ ] AC-2: licenses.html에 배포 앱에 들어가는 오픈소스 12개(`@supabase/auth-js`, `@supabase/functions-js`, `@supabase/phoenix`, `@supabase/postgrest-js`, `@supabase/realtime-js`, `@supabase/storage-js`, `@supabase/supabase-js`, `iceberg-js`, `react`, `react-dom`, `scheduler`, `tslib`)의 이름, 버전, 라이선스, 저작권 표시가 있고, MIT와 0BSD 라이선스 전문이 있다.
- [ ] AC-3: licenses.html에 악기 음원(FluidR3 GM, Frank Wen, CC BY 3.0, 가져온 곳 midi-js-soundfonts, 바꾸지 않았다는 표시)과 글꼴(DM Sans, Noto Sans KR, SIL OFL 1.1, Google Fonts에서 받아 씀)이 있다.
- [ ] AC-4: 자동 테스트가 `package.json`의 `dependencies` 이름이 모두 licenses.html에 적혀 있는지 확인한다. (나중에 라이브러리를 추가하고 표시를 잊으면 테스트가 실패한다.)
- [ ] AC-5: 수첩 탭 아이디어 카드 아래에 영감 탭과 같은 음원 출처 한 줄이 보인다.
- [ ] AC-6: 개인정보처리방침 8번에 (1) 인터넷 없이 열기용 저장 공간(앱 파일·들어 본 악기 음원, 개인정보 없음), (2) 삼성 인터넷과 홈 화면 설치 앱에서 지우는 방법, (3) "음성 메모는 백업 파일에 들어가지 않아 사이트 데이터를 지우면 되살릴 수 없다"가 있다.
- [ ] AC-7: 개인정보처리방침 9번에 녹음은 수첩에서 듣고 지울 수 있고, 백업 내보내기에는 들어가지 않는다는 내용이 있다.
- [ ] AC-8: 개인정보처리방침 변경 이력의 2026년 11월 6일 줄에 이번 보완(저장 공간 안내, 지우는 방법)이 함께 적혀 있다. 시행일은 2026년 11월 6일 그대로다.
- [ ] AC-9: `public/icons.svg`, `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg`가 지워지고, 어디서도 쓰지 않는다 (`npm run build` 성공).
- [ ] AC-10: `CLAUDE.md`의 `public/` 설명에 licenses.html이 있고, "외부 자료·라이브러리를 추가하면 licenses.html도 고친다"는 규칙이 있다.
- [ ] AC-11: `npm test`, `npm run build`, `npm run lint`가 오류 없이 끝난다.

## 비범위

- 법률 검토 (이 명세는 공개된 라이선스 조건을 기준으로 한 점검이다)
- 개발할 때만 쓰는 도구(Vite, Vitest, oxlint 등)의 표시: 배포 앱에 들어가지 않는다
- 글꼴 파일을 직접 받아 서버에 두기 (지금처럼 Google Fonts에서 받는다)
- 라이선스 목록을 빌드할 때 자동으로 만들기

## 데이터 영향

| 항목 | 내용 |
|---|---|
| 사용하는 localStorage 키 | 없음 |
| 데이터 구조 변경 | 없음 |
| 마이그레이션 | 필요 없음 |

## 확인 방법

- 자동: `npm test`, `npm run build`, `npm run lint`
- 수동 (브라우저):
  1. `npm run dev` 실행 후 http://localhost:5173/ 열기
  2. 바닥글 "출처·라이선스" → 새 창에 목록과 전문이 보이는지, 휴대폰 너비에서 가로로 넘치지 않는지 확인
  3. 수첩 탭 아래 음원 출처 확인
  4. `/privacy.html` 8·9번, 변경 이력 확인
