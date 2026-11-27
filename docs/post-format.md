# 정보 글 형식 (사용자 프롬프트 1~5 기준)

새 정보 글은 이 형식을 그대로 따른다. 완성된 예시는 `content/posts/jongbu-tax-payment.md`, `content/posts/freelance-refund.md`.

## 머리말
```
---
title: {키워드} | {숫자가 들어간 후킹 문구}   ← 50자 안팎, 숫자 필수
category: 세금정보 | 급여정보 | 알바정보 | 생활정보 | 보험정보 | 연금정보 | 퇴직정보 | 노무정보 | 복권정보 | 꼭 챙길 돈
date: YYYY-MM-DD          ← 미래 날짜면 그날 07시 자동 공개
excerpt: 한두 문장 요약
calc: 관련 계산기 id (없으면 생략)
---
```

## 본문 순서 (각 HTML 블록 안에는 빈 줄을 넣지 않는다. 빈 줄로 블록을 나눈다)
1. 도입 `<p>`: 첫 문장에 키워드, `<strong>`과 `<u>`를 하나 이상 쓴다. 숫자 하나로 궁금하게 만든다.
2. CTA 안내 줄: `<p style="text-align:center;" data-ke-size="size16"><b>🎁 아래 <span style="color:#ee2323;">버튼</span>을 통해, 지금 바로 해보세요!</b></p>`
3. `<div class="cta-container">` 안에 `<a class="click-me-button" href="...">두 줄<br>문구</a>` 3개 (받는돈 계산기·공식 사이트·관련 글).
4. 섹션 3개. 각 섹션은:
   - `<h2><strong>제목</strong></h2>`
   - `<p>`·`<ul>`/`<ol>` 본문
   - 행동 유도 줄 `<p>👇 ...</p>`
   - `<div><center><p><a class="link1" href="..." target="_self">버튼 문구</a></p></center></div>` (섹션 순서대로 link1, link2, link3)
   - `<h3><strong>소제목</strong></h3>` + `<p>`
5. 섹션 2 뒤에 최신 글 상자(빌드가 목록을 채운다):
   `<div class="rss-container"><p class="rss-title" data-ke-size="size18">🎁 최신 글 보기</p><ul id="rss-list" style="list-style-type: disc;" data-ke-list-type="disc"></ul></div>`
6. 표: `<div class="table-container custom-table"><table class="technical-table custom-table__table">` caption, 머리행(항목 + 3열), 몸통 3행. 가운데 행은 `<span class="spec-low custom-badge">`, `spec-mid`, `spec-high` 배지.
7. FAQ: `<div class="faq-section custom-faq">` 제목 h2 + 질문 5개(`h3.custom-faq__question`) / 답(`p.custom-faq__answer`, 답마다 `a.custom-faq__link` 1개).
8. 버튼 3개: `<div class="데이비-버튼3개">` 안에 `a.데이비-버튼` 3개, 아이콘은 `<span class="material-symbols-outlined">home|settings|info</span>`.
9. 맨 끝 "참고한 공식 자료" 상자:
   `<div class="refs"><p class="refs-t">참고한 공식 자료</p><ul><li><a href="공식 URL" target="_blank" rel="noopener">기관: 자료 제목 (게시일)</a></li></ul><p class="refs-n">금액과 기준은 바뀔 수 있어요. 신청하거나 신고하기 전에 공식 사이트에서 한 번 더 확인하세요.</p></div>`

## 지킬 것
- 해요체, 짧고 쉬운 문장. 본문 문단 끝에 출처 표시나 각주를 달지 않는다(출처는 9번 상자에만).
- 숫자·세율·날짜는 공식 출처(정부 부처, 정책브리핑, 국세청·공단, 법령)로 확인한 것만. 모르면 쓰지 않는다.
- 금액 예시는 받는돈 계산기로 직접 계산한 값만 쓴다.
- 기사 문장을 베끼지 않는다. 공식 기관을 사칭하는 문구 금지.
- 복권 글은 "당첨 확률을 높인다" 표현 금지, 통계·명당은 재미로 보는 정보라고 밝힌다.
- 내부 링크는 실제로 있는 페이지만(아직 공개 전인 예약 글로 링크하지 않는다).
- 개인정보(주민번호·계좌 등)를 묻거나 받는 문구 금지. 신청은 공식 사이트로 연결만.
