# 받는돈 (getdon24.com)

세금 떼고 진짜 받는 돈을 계산하는 사이트예요. 계산기 16종, 로또 6/45·연금복권720+ 당첨 결과, 정보 게시판이 있어요.

- 모든 페이지가 고유 주소를 가진 HTML 로 미리 만들어져요 (검색 노출·공유용)
- 로또·연금복권은 추첨 후 동행복권 공식 자료를 자동으로 받아, 검증을 통과해야만 반영돼요
- 게시글은 날짜를 적어 두면 그날 아침 7시에 자동으로 공개돼요

## 주소 구조

| 주소 | 내용 |
|---|---|
| `/` | 홈 |
| `/calc/` , `/calc/{계산기}/` | 계산기 목록, 계산기 16종 (예: `/calc/freelance/`) |
| `/lotto/` , `/lotto/{회차}/` , `/lotto/all/` | 로또 최신 회차, 회차별 상세, 전체 목록 |
| `/pension/` , `/pension/all/` | 연금복권 |
| `/blog/` , `/blog/{글}/` | 게시판 |
| `/about/` `/contact/` `/privacy/` | 소개, 문의, 개인정보처리방침 |

## 자주 하는 일

### 게시글 쓰기
`content/posts/` 에 `영문-주소.md` 파일을 만들어요. 파일 이름이 글 주소가 돼요.

```markdown
---
title: 글 제목
category: 세금정보
date: 2026-11-03
excerpt: 검색 결과와 목록에 보일 한두 문장 요약
calc: salary
---

첫 문단이에요.

## 소제목

본문이에요. **굵게**, [링크](/calc/salary/) 를 쓸 수 있어요.

- 목록 1
- 목록 2
```

- `date` 가 오늘보다 뒤면 그날 아침 7시에 자동 공개돼요 (예약 발행)
- `calc` 는 글 끝에 붙일 계산기 주소 이름이에요 (없으면 지워도 돼요)

### 설정 바꾸기 (`config.json`)
| 항목 | 설명 |
|---|---|
| `email` | 문의 페이지에 보일 메일 주소 |
| `adsenseClient` | 애드센스 승인 후 `ca-pub-숫자` 를 넣으면 광고 코드와 ads.txt 가 자동으로 들어가요 |
| `ga4` | 구글 애널리틱스 측정 ID (`G-...`) |
| `googleVerification` / `naverVerification` | 서치콘솔·서치어드바이저 소유 확인 값 |

### 세율·요율 바꾸기
`src/app.js` 맨 위의 `DEFAULT_RATES` (국민연금·건강보험·최저시급 등)를 고치면 모든 계산기에 반영돼요.

## 자동 업데이트

`.github/workflows/update.yml` 이 아래 시간에 실행돼요 (한국 시간).

- 토 20:50 ~ 22:40 로또 당첨번호, 일 09:00 1등 판매점
- 목 19:30 · 20:30 연금복권
- 매일 07:00 예약 글 공개

공식 자료 주소는 2026년 개편된 동행복권 사이트 기준이에요. 동행복권이 다시 개편하거나 접속을 막으면 실행이 실패하고 GitHub 이 메일로 알려 줘요. 이때 기존 데이터는 바뀌지 않아요.

처음 배포한 뒤 **Actions → 당첨번호 업데이트·예약 발행 → Run workflow → "공식 자료로 전체 다시 받기" 체크** 로 한 번 실행하면, 모든 회차를 동행복권 공식 자료와 다시 대조해요.

## 직접 실행

```bash
node scripts/build.mjs          # dist/ 에 사이트 생성
node scripts/test.mjs           # 데이터 검사
node scripts/update-lotto.mjs   # 로또 새 회차 받기
node scripts/update-pension.mjs # 연금복권 새 회차 받기
```

## Cloudflare Pages 설정 값

| 항목 | 값 |
|---|---|
| Framework preset | None |
| Build command | `node scripts/build.mjs` |
| Build output directory | `dist` |
| 환경 변수 | `NODE_VERSION` = `22` |
