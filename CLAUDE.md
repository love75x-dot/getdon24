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
- `src/map-kr.json` 로또 1등 지도(/lotto/map/) 경계. `scripts/make-map.py` 로 한 번 만든 파일(통계청 2013 경계 가공). 주소→지역 규칙은 build.mjs `unitOf` 와 make-map.py 가 같아야 하고, 빌드 때 "지도에 없는 지역"이 찍히면 두 곳에 규칙을 더한다.
- 손으로 관리하는 자료(봇이 안 건드림): `data/benefits.json` 받을 돈 항목(/find/, /benefit/{id}/ 상세. steps·docs·mistakes 는 공식 출처로 확인한 것만), `data/musts.json` 이번 달 꼭 챙길 것(/month/·홈. start·end 가 MM-DD 면 해마다, YYYY-MM-DD 면 그해만), `data/deadlines.json` 신고 마감. 받을 돈 진단(/check/) 규칙은 app.js `dqMatch`. benefits·musts 의 `asof`(기준일)가 1년 넘으면 화면에 "1년 넘은 기준"이 자동 표시되니, 공식 출처를 다시 확인하고 `asof`·`src`·`srcUrl` 을 고친다.
- 정보 글 형식은 `docs/post-format.md` 를 따른다(제목 "키워드 | 숫자 후킹", CTA·3섹션·표·FAQ·버튼).
- 정보 글은 맨 끝에 `<div class="refs">` "참고한 공식 자료" 상자를 둔다(바로가기 글 제외). 새 글도 같은 형식으로 공식 출처를 넣는다.
- `scripts/indexnow.mjs` 새로 공개된 글·회차 주소를 IndexNow(네이버·Bing)로 알림. update.yml 이 데이터를 저장한 뒤 자동 실행. 열쇠는 config.json `indexNowKey`, 확인 파일 `static/{열쇠}.txt`(공개 값).
- `config.json` 사이트 주소, 문의 메일, 애드센스·GA·검색 소유확인 값.

## 새 계산기 추가
1. `src/app.js` 에 `calcs.push({id, label, title, group, fields, run(v){ return {main, sub:[[이름,값]], related:[]} }})`
   - group: employee / freelance / employer / lotto. sub 의 값이 `null` 이면 소제목, `''` 이면 안내 문장.
2. `CALC_FAQ[id]`, `LEGAL_BASIS[id]` 추가
3. `scripts/build.mjs` 의 `CALC_DESC[id]` 에 검색 설명 한두 문장
4. 주소는 자동으로 `/calc/{id}/`
5. `HOWTO[id]`(계산하는 법·자주 하는 실수), `scripts/test.mjs` 의 정답 예시 1건 추가
6. 공유 이미지: `node scripts/make-og.cjs` 를 돌려 `static/og/{id}.png` 를 만든다 (로컬 Playwright 필요)

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

## 정해진 날 할 일
- 2026년 12월 국회 예산·세법 처리 뒤: app.js `Y27`(/2027/ 페이지)의 정부안·국회 심의 중 항목을 확정 숫자와 상태로 고치고, 같은 내용으로 "2027년부터 달라지는 돈" 글을 예약한다.
- 2027년 1월: 홈 검색 설명(build.mjs `emit('home'`)의 "올해 결혼하면 부부 세금 100만 원 환급" 문구 교체(결혼세액공제는 2026년 혼인신고까지). `data/musts.json` 의 2026년 한정 항목도 정리.
