# 받는돈 (getdon24.com) 작업 안내

세금 떼고 실제로 받는 돈을 계산하는 한국어 사이트. 정적 사이트 생성기로 모든 페이지를 HTML 로 미리 만들고 Cloudflare Pages 가 배포한다.
`main` 에 push 하면 Cloudflare 가 `node scripts/build.mjs` 로 다시 빌드해 1~2분 안에 반영된다.

## 구조
- `src/app.js` 화면·계산기 전부. 브라우저와 빌드(Node vm)에서 같은 코드가 돈다.
  - 위쪽: 계산기 정의 `calcs` 배열, `DEFAULT_RATES`(요율), `CALC_FAQ`, `LEGAL_BASIS`
  - 화면 함수: `home` `calcList` `calcView` `lotto` `lottoWin` `place` `gen` `pension` `guide` `bpost` `draw` `allDraws` `penAll`, 라우팅 `pathOf`/`routeOf`, 그리기 `view()`/`render()`
  - 주의: 최상위에서 `document`·`location` 을 바로 만지면 빌드가 깨진다. 함수 안에서만 쓴다.
- `src/style.css` 디자인 토큰(`:root` 색·글꼴)과 스타일. 다크모드는 `prefers-color-scheme` + `[data-theme]` 두 곳에 같은 값.
- `scripts/build.mjs` 페이지 생성, 검색용 제목·설명(`CALC_DESC`), JSON-LD, sitemap, 예약 발행.
- `scripts/update-lotto.mjs` / `update-pension.mjs` 동행복권 공식 자료 수집·검증. `scripts/test.mjs` 데이터 검사.
- `content/posts/*.md` 게시글 (머리말 title·category·date·excerpt·calc). date 가 미래면 그날 07시에 자동 공개.
- `data/` 로또·연금·판매점 데이터. GitHub Actions 가 자동 갱신하므로 직접 고치지 않는다.
- `config.json` 사이트 주소, 문의 메일, 애드센스·GA·검색 소유확인 값.

## 새 계산기 추가
1. `src/app.js` 에 `calcs.push({id, label, title, group, fields, run(v){ return {main, sub:[[이름,값]], related:[]} }})`
   - group: employee / freelance / employer / lotto. sub 의 값이 `null` 이면 소제목, `''` 이면 안내 문장.
2. `CALC_FAQ[id]`, `LEGAL_BASIS[id]` 추가
3. `scripts/build.mjs` 의 `CALC_DESC[id]` 에 검색 설명 한두 문장
4. 주소는 자동으로 `/calc/{id}/`

## 확인 방법 (고친 뒤 항상)
```bash
node scripts/build.mjs && node scripts/test.mjs
npx serve dist        # 또는: cd dist && python3 -m http.server 8000
```
휴대폰 폭(390px)에서 줄바꿈 없이 한 줄로 보이는지, 다크모드에서 글자가 보이는지 확인한다.

## 글쓰기 원칙
- 친근한 해요체, 짧고 쉬운 문장. 전문용어는 풀어서.
- 숫자·세율·법 조항은 근거가 있는 것만. 확실하지 않으면 "확인 필요"로 남기고 사용자에게 묻는다.
- 복권은 "당첨 확률을 높인다"는 표현 금지(애드센스 정책). 통계·명당은 재미로 보는 정보라고 밝힌다.
- 동행복권·국세청 등 공식 기관을 사칭하는 디자인이나 문구는 쓰지 않는다.
