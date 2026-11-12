# 마감 임박 혜택 데이터

## events.json — 기업 이벤트 (직접 등록)
GitHub 에서 이 파일을 열고 연필(✏️) 버튼으로 고친 뒤 "Commit changes" 를 누르면 1~2분 뒤 사이트에 반영돼요.
항목 사이에는 쉼표(,)를 넣어요. 형식이 틀리면 사이트 생성이 멈추고 이유가 나와요(사이트는 그전 상태로 유지).

```json
[
  {
    "id": "kbank-boss-vacation-2",
    "name": "사장님 유급휴가 보내기2",
    "host": "케이뱅크",
    "maxAmount": "",
    "target": ["소상공인"],
    "condition": "내가 쓴 응모 조건 한 줄 요약",
    "deadline": "2026-11-22",
    "applyUrl": "https://공식 응모 페이지",
    "sourceUrl": "https://출처 기사",
    "checkedAt": "2026-11-12"
  }
]
```

| 항목 | 필수 | 설명 |
|---|---|---|
| id | ✔ | 영문·숫자·하이픈. 카드 주소(/benefits/#id)로 쓰여요. 한 번 정하면 바꾸지 마세요 |
| name | ✔ | 혜택 이름 |
| host | ✔ | 주최 (은행·카드사·플랫폼 등) |
| maxAmount |  | 최대 금액. 공식 안내에 있는 그대로. 모르면 "" |
| target | ✔ | 소상공인 / 직장인 / 청년 / 육아 중 하나 이상 |
| condition |  | 응모 조건 한 줄 (기사 문장을 복사하지 말고 직접 요약) |
| deadline | ✔ | 마감일 YYYY-MM-DD |
| applyUrl | ✔ | 공식 응모 링크 |
| sourceUrl |  | 출처 기사 링크 |
| checkedAt | ✔ | 정보를 확인한 날 YYYY-MM-DD |

## gov.json — 정부 지원사업 (자동 수집, 직접 고치지 마세요)
`scripts/update-support.mjs` 가 매일 기업마당 API 에서 받아 와요. API 키는 GitHub Secrets 의 `BIZINFO_API_KEY` 에 넣어요.
