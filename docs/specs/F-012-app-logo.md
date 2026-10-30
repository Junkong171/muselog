# F-012: 앱 로고(연습 노트 아이콘) 적용

- 상태: 구현됨
- 작성일: 2026-10-31
- 관련 파일: `public/logo.svg`(새로), `public/apple-touch-icon.png`(새로), `public/favicon.svg`, `index.html`, `src/App.jsx`, `src/App.css`

## 목적

카카오 앱 아이콘으로 고른 시안 8번(연습 노트: 보라 둥근 사각형 + 흰 노트 + 책갈피 + 음표)을 앱 곳곳의 로고 자리에 똑같이 써서, 앱과 카카오 로그인 화면의 모습을 맞춘다.

## 사용자 시나리오

1. 사용자가 브라우저에서 MUSELOG를 연다.
2. 브라우저 탭 아이콘(파비콘)에 연습 노트 로고가 보인다.
3. 사이드바 맨 위 "MUSELOG" 글자 왼쪽에도 같은 로고가 보인다.
4. 휴대폰에서 "홈 화면에 추가"를 하면 같은 로고가 앱 아이콘으로 쓰인다.

## 수용 기준

- [ ] AC-1: `public/logo.svg`가 시안 8번 그림(보라 `#9a8ebb` 둥근 사각형, 흰 노트, 연보라 책갈피, 음표)이다.
- [ ] AC-2: `public/favicon.svg`가 `logo.svg`와 같은 그림이고, 브라우저 탭 아이콘으로 보인다. (예전 Vite 번개 모양이 아니다)
- [ ] AC-3: `index.html`에 `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`가 있고, `public/apple-touch-icon.png`는 시안 8번 PNG(정사각형)다.
- [ ] AC-4: `index.html`의 `<title>`이 `MUSELOG`이고, `<html lang="ko">`다.
- [ ] AC-5: 사이드바 맨 위 로고 자리(`.brand-icon`)에 `♪` 글자 대신 `logo.svg` 그림(`<img>`, `alt=""`)이 43×43 크기로 보인다. "MUSELOG / YOUR MUSIC JOURNAL" 글자는 그대로다.
- [ ] AC-6: 로그인하지 않은 상태에서 상단 오른쪽 프로필의 "M" 동그라미 자리에 로고 그림이 보인다. 로그인한 상태의 프로필(사진·이름 첫 글자)은 바뀌지 않는다.
- [ ] AC-7: 화면 폭 700px 이하(휴대폰)에서도 사이드바 로고가 찌그러지거나 넘치지 않는다.
- [ ] AC-8: `npm test`, `npm run build`, `npm run lint`가 오류 없이 끝난다.

## 비범위

- 쓰지 않는 Vite 기본 파일(`public/icons.svg`, `src/assets/react.svg`, `vite.svg`, `hero.png`) 삭제: 이번에는 건드리지 않는다.
- PWA(앱처럼 설치) 설정 파일(`manifest.json`)은 만들지 않는다.
- 로고 그림 자체를 새로 디자인하지 않는다. 시안 8번을 그대로 쓴다.
- 대시보드 배너, 음표 표지 그림(♫ ♪ ♬ ♩)은 바꾸지 않는다.

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
  2. 브라우저 탭 아이콘이 연습 노트 로고인지 본다. (예전 아이콘이 남아 있으면 Ctrl+F5)
  3. 사이드바 맨 위 로고를 본다.
  4. 로그아웃 상태에서 오른쪽 위 프로필 동그라미를 본다.
  5. 창을 좁혀(700px 이하) 사이드바 로고를 다시 본다.
