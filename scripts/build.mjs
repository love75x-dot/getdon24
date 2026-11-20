// 받는돈(getdon24.com) 정적 사이트 생성기
//
//   node scripts/build.mjs                 dist/ 에 사이트 전체를 만든다
//   node scripts/build.mjs --published     발행된 글 목록만 data/published.txt 에 기록 (예약 발행 확인용)
//   BUILD_DATE=2026-10-27 node scripts/build.mjs   특정 날짜 기준으로 만들어 보기
//
// 모든 페이지는 src/app.js 의 화면 함수를 Node 에서 그대로 실행해 미리 그려 둔다(검색엔진이 읽을 수 있게).
// 브라우저에서는 같은 app.js 가 다시 그리면서 계산기 입력 등 상호작용을 붙인다.

import { readFile, writeFile, mkdir, readdir, rm, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const config = JSON.parse(await readFile(join(ROOT, 'config.json'), 'utf8'));
const SITE = config.siteUrl.replace(/\/$/, '');
const TODAY = process.env.BUILD_DATE || new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); // 한국 날짜

// ---------- 게시글 ----------
function parsePost(slug, text) {
  const m = text.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/); // 윈도우 CRLF 줄바꿈 대응
  if (!m) throw new Error(`${slug}.md: 맨 위 --- 머리말이 없어요`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  for (const k of ['title', 'category', 'date', 'excerpt']) if (!meta[k]) throw new Error(`${slug}.md: ${k} 가 비어 있어요`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) throw new Error(`${slug}.md: date 는 2026-10-24 형식이어야 해요`);
  const html = mdToHtml(m[2]);
  const chars = html.replace(/<[^>]+>/g, '').length;
  // 게시판 분류는 3개(급여·세금·복권)로 묶는다. 글 파일의 category 는 그대로 두고 화면에서만 묶음
  const CAT3 = { 세금정보: '세금', 복권정보: '복권', 바로가기: '바로가기', '꼭 챙길 돈': '꼭 챙길 돈' };
  return { slug, title: meta.title, cat: CAT3[meta.category] || '급여', catRaw: meta.category, date: meta.date, excerpt: meta.excerpt, calc: meta.calc || '', min: Math.max(1, Math.round(chars / 500)), html };
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function inline(s) {
  return s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, (_, t, u) => `<a href="${u}"${u.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`);
}
// 아주 작은 마크다운: ## 소제목, - 목록, **굵게**, [링크](주소), 빈 줄로 문단 구분. < 로 시작하는 줄은 HTML 그대로.
function mdToHtml(md) {
  return md.trim().split(/\n\s*\n/).map((b) => {
    b = b.trim();
    if (b.startsWith('<')) return b;
    if (b.startsWith('## ')) return `<h2>${inline(b.slice(3))}</h2>`;
    if (b.startsWith('### ')) return `<h3>${inline(b.slice(4))}</h3>`;
    if (/^- /m.test(b) && b.split('\n').every((l) => l.startsWith('- '))) return `<ul>${b.split('\n').map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`;
    if (b.split('\n').every((l) => /^\d+\. /.test(l))) return `<ol>${b.split('\n').map((l) => `<li>${inline(l.replace(/^\d+\. /, ''))}</li>`).join('')}</ol>`;
    return `<p>${inline(b.replace(/\n/g, ' '))}</p>`;
  }).join('\n');
}
async function loadPosts() {
  const dir = join(ROOT, 'content/posts');
  const all = [];
  for (const f of (await readdir(dir)).filter((f) => f.endsWith('.md')).sort()) {
    all.push(parsePost(f.replace(/\.md$/, ''), await readFile(join(dir, f), 'utf8')));
  }
  return all.filter((p) => p.date <= TODAY).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

// ---------- 로또·연금·판매점 ----------
// 주소 → 지도 단위(시도|시군구). src/map-kr.json(scripts/make-map.py)과 같은 규칙
const METRO = ['서울', '부산', '대구', '인천', '광주', '대전', '울산'];
const GU_GJ = ['동구', '서구', '남구', '북구', '광산구'];
const PROV_OF = { 서울: '서울', 부산: '부산', 대구: '대구', 인천: '인천', 광주: '광주·전남', 전남: '광주·전남', 전남광주: '광주·전남', 대전: '대전', 울산: '울산', 세종: '세종', 경기: '경기', 강원: '강원', 충북: '충북', 충남: '충남', 전북: '전북', 경북: '경북', 경남: '경남', 제주: '제주' };
const unmatched = [];
function unitOf(s) {
  const t = s.address.split(/\s+/), g = PROV_OF[t[0]];
  if (!g) return null;
  if (g === '세종') return '세종|세종';
  let u = t[1] || '';
  if (u === '군위군') return '대구|군위군';
  if (g === '인천') {
    if (['중구', '동구', '제물포구', '영종구'].includes(u)) u = '중구·동구';
    else if (['서구', '서해구', '검단구'].includes(u)) u = '서구';
    else if (u === '남구') u = '미추홀구';
    return `${g}|${u}`;
  }
  if (t[0] === '광주' || (t[0] === '전남광주' && GU_GJ.includes(u))) return `광주·전남|광주 ${u}`;
  if (METRO.includes(t[0])) return `${g}|${u}`;
  if (u === '청원군') u = '청주시';
  if (u === '마산시' || u === '진해시') u = '창원시'; // 2010년 통합 전 주소
  if (g === '전북' && /^(완산|덕진)구$/.test(u)) u = '전주시'; // 시 이름이 빠진 주소
  if (u === '여주군') u = '여주시';
  if (u === '당진군') u = '당진시';
  return `${g}|${u}`;
}
const isInternet = (s) => s.id === '51100000' || s.name.includes('인터넷');
async function loadPlaces(latestRound) {
  const dir = join(ROOT, 'data/stores');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
  const rounds = files.map((f) => +f.replace('.json', '')).sort((a, b) => a - b);
  const region = new Map(), shop = new Map(), units = new Map();
  let total = 0;
  for (const r of rounds) {
    const { stores } = JSON.parse(await readFile(join(dir, `${r}.json`), 'utf8'));
    for (const s of stores) {
      if (isInternet(s)) continue;
      total++;
      region.set(s.region, (region.get(s.region) || 0) + 1);
      const key = s.id || s.name + s.address;
      const o = shop.get(key) || { name: s.name, address: s.address, n: 0 };
      o.n++;
      shop.set(key, o);
      const uk = unitOf(s);
      if (uk) {
        const u = units.get(uk) || { n: 0, last: 0, shops: new Map() };
        u.n++; u.last = Math.max(u.last, r); u.shops.set(key, o);
        units.set(uk, u);
      } else unmatched.push(s.address);
    }
  }
  const short = (a) => a.split(' ').slice(0, 3).join(' ');
  // 최신 회차 1등 판매점 (같은 곳 여러 건은 묶음)
  const lr = rounds.includes(latestRound) ? latestRound : rounds[rounds.length - 1];
  const { stores: latest } = JSON.parse(await readFile(join(dir, `${lr}.json`), 'utf8'));
  const grouped = new Map();
  for (const s of latest) {
    const key = (s.id || s.name + s.address) + s.method;
    const g = grouped.get(key) || [isInternet(s) ? '인터넷 복권판매사이트' : s.name, isInternet(s) ? '동행복권 사이트' : short(s.address), s.method, 0];
    g[3]++;
    grouped.set(key, g);
  }
  const latestRegions = new Set(latest.filter((s) => !isInternet(s)).map((s) => s.region));
  return {
    from: rounds[0], to: rounds[rounds.length - 1], total,
    latest: { r: lr, games: latest.length, rows: [...grouped.values()] },
    regions: [...region.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v, latestRegions.has(k) ? 1 : 0]),
    top: [...shop.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).slice(0, 100).map((s) => [s.name, short(s.address), s.n]),
    // 1등 지도: [시도, 시군구, 1등 건수, 마지막 1등 회차, [[판매점, 주소, 건수] 상위 10곳]]
    map: [...units.entries()].map(([k, u]) => [...k.split('|'), u.n, u.last,
      [...u.shops.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).slice(0, 10).map((o) => [o.name, short(o.address), o.n])]),
  };
}

// 공유 이미지: static/og/{이름}.png 가 있으면 그 화면 전용 이미지 (scripts/make-og.cjs 로 만든다)
function ogOf(route) {
  const n = route.startsWith('c-') ? route.slice(2) : route;
  return existsSync(join(ROOT, 'static/og', n + '.png')) ? `/og/${n}.png` : '/og-image.png?v=2';
}
// ---------- 페이지 틀 ----------
function page({ route, title, desc, html, tabs, jsonld, assets, noindex, ogType = 'website', pre = false }) {
  const url = SITE + pathOf(route);
  const ads = config.adsenseClient ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.adsenseClient}" crossorigin="anonymous"></script>` : '';
  const ga = config.ga4 ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${config.ga4}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${config.ga4}');</script>` : '';
  const verify = [config.googleVerification && `<meta name="google-site-verification" content="${esc(config.googleVerification)}">`, config.naverVerification && `<meta name="naver-site-verification" content="${esc(config.naverVerification)}">`].filter(Boolean).join('');
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:type" content="${ogType}"><meta property="og:site_name" content="받는돈">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}${ogOf(route)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:locale" content="ko_KR">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0B7A5A">
<link rel="icon" href="/favicon.ico?v=2" sizes="any"><link rel="icon" href="/favicon.png?v=2" type="image/png"><link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2"><link rel="manifest" href="/manifest.webmanifest?v=2"><meta name="apple-mobile-web-app-title" content="받는돈"><meta name="mobile-web-app-capable" content="yes">
${verify}
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap">
<link rel="stylesheet" href="/assets/style.css?v=${assets.css}">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}
${ads}${ga}
</head>
<body>
<header><div class="wrap" style="padding-bottom:0"><div class="hd"><div class="logo"><a href="/">받는<b>돈</b></a></div></div><nav class="topnav" id="tabs" aria-label="주요 메뉴">${tabs}</nav></div></header>
<main class="wrap" id="app">${html}</main>
<script>window.__ROUTE=${JSON.stringify(route)};${pre ? 'window.__PRE=1;' : ''}</script>
<script src="/assets/data.js?v=${assets.data}"></script>${extrasFor(route).map((k) => `<script src="/assets/data-${k}.js?v=${assets['x_' + k]}"></script>`).join('')}
<script src="/assets/app.js?v=${assets.js}"></script>
</body>
</html>
`;
}
// app.js 와 같은 주소 규칙
function pathOf(t) {
  if (t === 'home') return '/';
  if (t === 'calc') return '/calc/';
  if (t.startsWith('c-')) return `/calc/${t.slice(2)}/`;
  if (t === 'lotto') return '/lotto/';
  if (t === 'all') return '/lotto/all/';
  if (t === 'lmap') return '/lotto/map/';
  if (t.startsWith('draw')) return `/lotto/${t.slice(4)}/`;
  if (t === 'pension') return '/pension/';
  if (t === 'penall') return '/pension/all/';
  if (t === 'guide') return '/blog/';
  if (t.startsWith('b-')) return `/blog/${t.slice(2)}/`;
  if (t.startsWith('l-')) return `/life/${t.slice(2)}/`;
  if (t.startsWith('n-')) return `/benefit/${t.slice(2)}/`;
  return `/${t}/`;
}

// 계산기별 검색 설명 (검색 결과·카톡 미리보기에 나오는 문장)
const CALC_DESC = {
  'jeonse-guarantee': '전세보증금, 주택가격, 선순위 대출을 넣으면 HUG 전세보증보험(전세보증금반환보증) 보증료와 부채비율, 할인 금액을 계산해요.',
  'youth-future': '청년미래적금에 매달 넣는 돈과 금리를 넣으면 3년 뒤 정부 기여금(6%·12%)과 비과세 이자까지 만기에 받는 돈을 계산해요.',
  brokerage: '매매·전세·월세 금액을 넣으면 받을 수 있는 최대 중개보수(복비)와 상한요율을 계산해요. 월세 환산(×100, ×70)과 오피스텔 요율까지 반영해요.',
  'car-tax': '배기량과 처음 등록한 해를 넣으면 1년 자동차세와 지방교육세, 6월·12월 납부액을 계산해요. 차령 경감과 전기차 세액도 반영해요.',
  percent: 'A의 B%는 얼마인지, A는 B의 몇 %인지, 가격이 몇 % 올랐는지, 할인·인상 금액까지 퍼센트 계산을 한 번에 해요.',
  vat: '공급가액을 넣으면 부가세 10%와 합계를, 합계를 넣으면 공급가액과 부가세를 나눠 계산해요.',
  pyeong: '제곱미터(㎡)를 평으로, 평을 ㎡로 바꿔요. 1평은 약 3.3058㎡예요. 84㎡는 몇 평인지 바로 확인하세요.',
  age: '생년월일을 넣으면 오늘 기준 만 나이, 연 나이, 다음 생일까지 남은 날을 계산해요. 2023년부터 쓰는 만 나이 기준이에요.',
  deposit: '예치금액, 기간, 이자율만 넣으면 이자 세금 15.4%를 뗀 예금 만기 수령액을 바로 계산해요. 단리·월복리, 비과세까지 비교할 수 있어요.',
  savings: '매달 넣는 금액과 기간, 이자율을 넣으면 세금 뗀 적금 만기 수령액과 실제 이자를 계산해요. 적금 이자가 생각보다 적은 이유도 알려 드려요.',
  goal: '목표 금액과 기간을 넣으면 매달 얼마씩 모아야 하는지, 매달 모을 금액을 넣으면 몇 년 걸리는지 이자와 세금까지 넣어 계산해요.',
  'goal-50m': '5천만원 모으려면 매달 얼마씩 모아야 할까요? 3년·5년·7년·10년 기간별 월 저축액을 이자와 세금까지 넣어 바로 계산해요.',
  'goal-100m': '1억 모으려면 매달 얼마씩 모아야 할까요? 지금 모아 둔 돈과 이자율을 넣으면 3년·5년·7년·10년 기간별 월 저축액을 바로 계산해요.',
  loan: '대출금액, 기간, 금리를 넣으면 원리금균등·원금균등·만기일시 상환별 월 상환액과 총 이자를 계산해요. 회차별 남은 원금도 보여 드려요.',
  'prepay-fee': '갚을 금액, 수수료율, 대출일·상환일·만기일을 넣으면 대출 중도상환수수료를 계산해요. 3년 면제기간도 반영해요.',
  salary: '연봉을 넣으면 4대보험과 소득세를 뗀 월 실수령액을 바로 계산해요. 국민연금, 건강보험, 고용보험, 소득세가 각각 얼마인지도 보여 드려요.',
  'salary-compare': '두 회사 연봉 조건을 넣으면 세금과 4대보험을 뗀 월 실수령액이 얼마나 차이 나는지 비교해요. 이직 연봉 협상 전에 써 보세요.',
  insurance: '월급을 넣으면 국민연금, 건강보험, 장기요양보험, 고용보험 공제액을 2026년 요율로 계산해요.',
  severance: '최근 3개월 급여와 근속기간을 넣으면 법정 퇴직금을 계산해요. 1일 평균임금 계산 과정까지 보여 드려요.',
  'annual-leave': '통상시급과 남은 연차 일수를 넣으면 받을 수 있는 연차수당을 계산해요.',
  'weekly-rest': '시급과 주당 근무시간을 넣으면 주휴수당을 계산해요. 주 15시간 미만이면 대상이 아닌 이유도 알려 드려요.',
  freelance: '프리랜서 3.3% 계산기예요. 계약 금액을 넣으면 실수령액을, 받은 금액을 넣으면 계약 금액을 거꾸로 계산해요. 소득세 3%와 지방소득세 0.3%를 나눠 보여 주고, 10원 단위 버림과 소액부징수까지 반영해요.',
  'tax-refund': '작년 프리랜서 소득과 업종을 넣으면 5월 종합소득세 신고 때 환급받을지, 더 낼지 미리 계산해요.',
  'labor-cost': '직원 월급을 넣으면 사업주가 부담하는 4대보험까지 더한 실제 총 인건비를 계산해요.',
  'minwage-check': '월급이나 시급을 넣으면 최저임금을 지키는지 바로 확인해요. 2026년 최저시급 10,320원, 최저 월급 2,156,880원(209시간) 기준이고 2027년부터는 10,700원이 자동 적용돼요.',
  'daily-worker-tax': '일당과 근무일수를 넣으면 일용직 근로소득세와 실제 지급액을 계산해요. 하루 15만원 공제를 반영해요.',
  'card-fee': '손님이 카드로 결제한 금액을 넣으면 카드 수수료를 빼고 사업자 통장에 들어오는 돈, 나중에 낼 부가세까지 계산해요.',
  compound: '처음 넣는 돈, 매달 넣는 돈, 연 이자율, 기간을 넣으면 복리로 불어난 금액을 계산해요. 월복리·연복리, 이자 세금 15.4%, 단리와의 차이, 연도별 잔액까지 보여 드려요.',
  parttime: '시급이나 일당, 출근 요일, 출퇴근·휴게시간을 넣으면 주급과 월급, 주휴수당을 받는지까지 계산해요. 연장·야간수당과 3.3%·4대보험 뗀 실수령액도 보여 드려요.',
  unemployment: '퇴직 전 월평균 급여, 고용보험 가입 기간, 나이를 넣으면 실업급여 하루 금액과 받는 기간, 총액을 계산해요. 2026년 상한액 68,100원 기준이에요.',
  wage: '시급, 일급, 주급, 월급, 연봉 중 아는 금액 하나와 근무시간만 넣으면 나머지를 한 번에 환산해요. 주 15시간 이상이면 주휴수당까지 포함해요.',
  overtime: '통상시급과 연장·야간·휴일 근무시간을 넣으면 근로기준법 기준 가산수당을 계산해요. 5인 미만 사업장 여부도 반영해요.',
  resign: '최근 3개월 급여, 근속기간, 남은 연차를 넣으면 퇴직금과 연차수당, 실업급여 예상액을 한 번에 더해 보여 드려요.',
  'split-14h': '주 15시간 1명 고용과 주 14시간 쪼개기 고용의 월 인건비를 비교해요. 주휴수당, 4대보험, 퇴직금 차이와 실제 시간당 비용까지 보여 드려요.',
  'lotto-tax': '로또 당첨금을 넣으면 세금을 뗀 실수령액을 계산해요. 3억까지 22%, 넘는 부분 33%를 단계별로 보여 드려요.',
  'pension-tax': '연금복권720+ 1등, 2등, 1등과 2등 동시 당첨까지 세금 22%를 뗀 매달 실수령액과 총액을 계산해요.',
};

// 검색 결과 <title>: 짧은 화면 이름 뒤에 검색어를 붙인다 (없으면 화면 이름 그대로)
const CALC_SEO = {
  'jeonse-guarantee': '전세보증보험 보증료 계산기 - HUG 반환보증',
  'youth-future': '청년미래적금 계산기 - 기여금·만기 수령액',
  brokerage: '복비 계산기 - 매매·전세·월세 중개수수료',
  'car-tax': '자동차세 계산기 - 배기량·연식별 연간 세금',
  age: '만 나이 계산기 - 오늘 기준 만 나이·연 나이',
  pyeong: '평수 계산기 - ㎡ 평 변환',
  vat: '부가세 계산기 - 공급가액·부가세 10% 나누기',
  percent: '퍼센트 계산기 - 비율·변화율·할인 계산',
  'goal-100m': '1억 모으기 계산기 - 매달 얼마씩 모아야 할까',
  'goal-50m': '5천만원 모으기 계산기 - 매달 얼마씩 모아야 할까',
  freelance: '3.3% 계산기 - 프리랜서 원천징수·역산',
  insurance: '4대보험 계산기 - 국민연금·건강보험·고용보험 공제액',
  'tax-refund': '종합소득세 환급 계산기 - 5월 프리랜서 환급액 예측',
  'labor-cost': '인건비 계산기 - 사업주 4대보험 포함 총 인건비',
  'minwage-check': '최저임금 계산기 - 월급·시급 최저임금 확인',
  'card-fee': '카드 수수료 계산기 - 카드 결제 입금액·부가세',
  compound: '복리 계산기 - 적금·투자 원금 이자 계산 (월복리·연복리)',
  parttime: '알바 월급 계산기 - 시급·일당 주급, 주휴수당, 실수령액',
  unemployment: '실업급여 계산기 2026 - 하루 금액·받는 기간·총액',
  wage: '시급 환산 계산기 2026 - 시급·일급·주급·월급·연봉 (주휴수당 포함)',
  overtime: '연장·야간·휴일수당 계산기 - 5인 이상·미만 구분',
  resign: '퇴사하면 받을 돈 계산기 - 퇴직금·연차수당·실업급여 합계',
  'split-14h': '쪼개기 고용 계산기 - 주 15시간 vs 14시간 인건비 비교',
  'lotto-tax': '로또 세금 계산기 - 당첨금 실수령액',
  'pension-tax': '연금복권 세금 계산기 - 연금복권720+ 실수령액',
};

// ---------- 실행 ----------
const args = process.argv.slice(2);
const posts = await loadPosts();

if (args.includes('--published')) {
  // 예약 발행: 오늘 공개되는 글이 바뀌었는지 기록 → 바뀌면 GitHub Actions 가 커밋해서 다시 배포된다
  await writeFile(join(ROOT, 'data/published.txt'), posts.map((p) => `${p.date} ${p.slug}`).join('\n') + '\n');
  console.log(`발행된 글 ${posts.length}개 (${TODAY} 기준)`);
  process.exit(0);
}

const lotto = JSON.parse(await readFile(join(ROOT, 'data/lotto.json'), 'utf8'));
const pension = JSON.parse(await readFile(join(ROOT, 'data/pension.json'), 'utf8'));
const latestRound = Math.max(...lotto.map((d) => d.round));
const places = await loadPlaces(latestRound);

// 마감 임박 혜택: 직접 등록한 기업 이벤트(events.json)는 형식을 엄격히 검사하고, 자동 수집(gov.json)과 같은 모양으로 맞춘다
const SUP_TAGS = ['소상공인', '직장인', '청년', '육아'];
async function loadSupport() {
  const ev = JSON.parse(await readFile(join(ROOT, 'data/support/events.json'), 'utf8'));
  const gov = JSON.parse(await readFile(join(ROOT, 'data/support/gov.json'), 'utf8'));
  const isDate = (x) => /^\d{4}-\d{2}-\d{2}$/.test(x || '') && !isNaN(new Date(x));
  const isUrl = (x) => /^https?:\/\/\S+$/.test(x || '');
  const errs = [], seen = new Set();
  const events = ev.map((e, i) => {
    const at = `events.json ${i + 1}번째 (${e.name || e.id || '이름 없음'})`;
    if (!/^[a-z0-9][a-z0-9-]*$/.test(e.id || '')) errs.push(`${at}: id 는 영문 소문자·숫자·하이픈만`);
    if (seen.has(e.id)) errs.push(`${at}: id 가 다른 항목과 같아요`); seen.add(e.id);
    for (const k of ['name', 'host']) if (!e[k]) errs.push(`${at}: ${k} 가 비어 있어요`);
    if (!isDate(e.deadline)) errs.push(`${at}: deadline 은 2026-11-22 형식`);
    if (!isDate(e.checkedAt)) errs.push(`${at}: checkedAt 은 2026-11-12 형식`);
    if (!isUrl(e.applyUrl)) errs.push(`${at}: applyUrl 은 https:// 로 시작하는 공식 링크`);
    if (e.sourceUrl && !isUrl(e.sourceUrl)) errs.push(`${at}: sourceUrl 형식이 이상해요`);
    const tags = (e.target || []).map((t) => (t === '육아 중' ? '육아' : t));
    if (!tags.length || tags.some((t) => !SUP_TAGS.includes(t))) errs.push(`${at}: target 은 ${SUP_TAGS.join('/')} 중에서`);
    return { id: e.id, kind: 'event', name: e.name, host: e.host, amount: e.maxAmount || '', tags, who: tags.join(' · '), cond: e.condition || '', start: e.start || '', end: e.deadline, url: e.applyUrl, src: e.sourceUrl || '', checked: e.checkedAt };
  });
  if (errs.length) throw new Error('기업 이벤트 등록 형식 오류:\n' + errs.join('\n'));
  const govs = gov.map((g) => ({ id: g.id, kind: 'gov', name: g.name, host: g.host, amount: g.amount || '', tags: g.tags || [], who: g.target || '', cond: '', start: g.start || '', end: g.end || '', url: g.url, src: '', checked: g.checkedAt }));
  // 화면에는 지금 신청할 수 있는 공고만, 마감이 가까운 순으로 최대 120건 (모든 페이지가 함께 받는 데이터라 가볍게)
  const openGov = govs.filter((g) => !g.end || g.end >= TODAY)
    .sort((a, b) => (a.end || '9999').localeCompare(b.end || '9999'))
    .slice(0, 120)
    .map(({ src, ...g }) => g);
  return [...events, ...openGov];
}

// 시즌 배너: config.json 의 seasons 중 오늘 날짜에 해당하는 것 하나
function seasonNow() {
  return (config.seasons || []).find((x) => x.from <= TODAY && TODAY <= x.until) || null;
}
// 매년 같은 날짜의 신고·납부 기한을 올해·내년 날짜로 펼친다. 마감일이 토·일이면 다음 월요일 (국세기본법 제5조).
// 공휴일은 반영하지 않아요 (화면에 안내).
function expandDeadlines(list) {
  const y = +TODAY.slice(0, 4), out = [];
  for (const yr of [y - 1, y, y + 1]) for (const d of list) {
    let end = new Date(`${yr}-${d.end}T00:00:00Z`), moved = false;
    while ([0, 6].includes(end.getUTCDay())) { end = new Date(+end + 864e5); moved = true; }
    const e = end.toISOString().slice(0, 10);
    if (e < TODAY) continue;
    out.push({ ...d, key: `${d.id}-${yr}`, start: `${yr}-${d.start}`, end: e, moved });
  }
  return out.sort((a, b) => a.end.localeCompare(b.end)).slice(0, 24);
}
// 이번 달 꼭 챙길 것: MM-DD 는 해마다, YYYY-MM-DD 는 그해만. 끝난 것은 뺀다
function expandMusts(list) {
  const y = +TODAY.slice(0, 4), out = [];
  for (const d of list) {
    const yrs = d.end.length > 5 ? [null] : [y - 1, y, y + 1];
    for (const yr of yrs) {
      const start = yr ? `${yr}-${d.start}` : d.start, end = yr ? `${yr}-${d.end}` : d.end;
      if (end < TODAY) continue;
      out.push({ ...d, key: `${d.id}-${yr || 'once'}`, start, end, must: 1 });
    }
  }
  return out.sort((a, b) => a.end.localeCompare(b.end));
}
function icsEsc(t) { return String(t).replace(/[\\,;]/g, (m) => '\\' + m).replace(/\n/g, '\\n'); }
function icsOf(items) {
  const d = (s) => s.replace(/-/g, ''), next = (s) => new Date(+new Date(s + 'T00:00:00Z') + 864e5).toISOString().slice(0, 10);
  const ev = items.map((x) => ['BEGIN:VEVENT', `UID:${x.key}@getdon24.com`, `DTSTAMP:${d(TODAY)}T000000Z`, `DTSTART;VALUE=DATE:${d(x.end)}`, `DTEND;VALUE=DATE:${d(next(x.end))}`,
    `SUMMARY:${icsEsc('[마감] ' + x.name)}`, `DESCRIPTION:${icsEsc(`${x.who}\n접수 ${x.start} ~ ${x.end}\n${x.url}\n근거: ${x.law}\n받는돈 getdon24.com/deadlines/`)}`, `URL:${x.url}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(x.name + ' 마감 3일 전')}`, 'TRIGGER:-P3D', 'END:VALARM', 'END:VEVENT'].join('\r\n'));
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//getdon24//deadlines//KO', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:받는돈 신고·신청 마감', 'X-WR-TIMEZONE:Asia/Seoul', ...ev, 'END:VCALENDAR', ''].join('\r\n');
}
const DATA = {
  draws: lotto.map((d) => [d.round, d.date, d.numbers, d.bonus, d.ranks[0][0], d.ranks[0][1], ...(d.firstMethods || [null, null, null]), d.sales]),
  pension: pension.map((p) => [p.round, p.date, p.group, p.number, p.bonus]),
  places,
  config: { email: config.email, siteUrl: SITE, season: seasonNow() },
  posts: posts.map(({ html, ...meta }) => meta),
  support: await loadSupport(),
  benefits: JSON.parse(await readFile(join(ROOT, 'data/benefits.json'), 'utf8')),
  deadlines: expandDeadlines(JSON.parse(await readFile(join(ROOT, 'data/deadlines.json'), 'utf8'))),
  musts: expandMusts(JSON.parse(await readFile(join(ROOT, 'data/musts.json'), 'utf8'))),
  hidden: JSON.parse(await readFile(join(ROOT, 'data/hidden.json'), 'utf8')),
  wtax: JSON.parse(await readFile(join(ROOT, 'data/wage-tax-2026-03.json'), 'utf8')),
};

// 화면 함수 실행 준비
const appJs = await readFile(join(ROOT, 'src/app.js'), 'utf8');
const css = await readFile(join(ROOT, 'src/style.css'), 'utf8');
// 모든 페이지가 받는 기본 데이터는 가볍게: 무거운 자료는 필요한 화면에서만 따로 받는다
const topBy = (arr, n) => [...arr].sort((a, b) => b[0] - a[0]).slice(0, n);
const { map: placeMap, ...placesCore } = DATA.places;
const mapJs = `window.DATA.lmap={geo:${await readFile(join(ROOT, 'src/map-kr.json'), 'utf8')},u:${JSON.stringify(placeMap)}};\n`;
const CORE = { ...DATA, config: { ...DATA.config, mapJs: `/assets/data-map.js?v=${createHash('sha1').update(mapJs).digest('hex').slice(0, 8)}` }, places: placesCore, draws: topBy(DATA.draws, 12), pension: topBy(DATA.pension, 6), support: [], wtax: null };
const dataJs = `window.DATA=${JSON.stringify(CORE)};\n`;
const EXTRA = {
  draws: `window.DATA.draws=${JSON.stringify(DATA.draws)};\n`,
  pension: `window.DATA.pension=${JSON.stringify(DATA.pension)};\n`,
  support: `window.DATA.support=${JSON.stringify(DATA.support)};\n`,
  wtax: `window.DATA.wtax=${JSON.stringify(DATA.wtax)};\n`,
  map: mapJs,
};
DATA.lmap = { geo: JSON.parse(await readFile(join(ROOT, 'src/map-kr.json'), 'utf8')), u: placeMap };
{ const have = new Set(DATA.lmap.geo.u.map((x) => x[0] + '|' + x[1])), miss = placeMap.filter((x) => !have.has(x[0] + '|' + x[1]));
  if (miss.length || unmatched.length) console.log('지도에 없는 지역:', miss.map((x) => x[0] + ' ' + x[1] + ' ' + x[2]).join(', '), unmatched.slice(0, 5).join(' / ')); }
// 화면별로 더 받을 자료
function extrasFor(route) {
  const x = [];
  if (route === 'all' || /^draw\d/.test(route)) x.push('draws');
  if (route === 'penall') x.push('pension');
  if (route === 'lmap') x.push('map');
  if (route === 'benefits' || route === 'find') x.push('support');
  if (['c-salary', 'c-salary-compare', 'c-parttime'].includes(route)) x.push('wtax');
  return x;
}
let els = {};
const stubEl = () => ({ innerHTML: '', textContent: '', value: '', scrollIntoView() {} });
const ctx = {
  window: { DATA, __PRERENDER: 1 },
  document: { getElementById: (id) => (els[id] ||= stubEl()), addEventListener() {} },
  location: { pathname: '/', href: '/' },
  history: { pushState() {}, replaceState() {} },
  localStorage: { getItem: () => null, setItem() {} },
  setInterval() {}, setTimeout() {}, scrollTo() {}, addEventListener() {},
  console, Date, Math, JSON, Object, Array, String, Number, Set, Map, RegExp, encodeURIComponent, decodeURIComponent, Intl,
};
ctx.window.window = ctx.window;
vm.createContext(ctx);
vm.runInContext(appJs, ctx, { filename: 'app.js' });
const call = (code) => vm.runInContext(code, ctx);

function renderRoute(route, postHtml) {
  els = {};
  ctx.window.__ROUTE = route;
  ctx.window.__POSTHTML = postHtml || '';
  call(`cur=${JSON.stringify(route)}`);
  let html = call('view()');
  if (route.startsWith('c-')) {
    call(`runC(${JSON.stringify(route.slice(2))})`);
    if (els.cres) html = html.replace('<div class="panel" id="cres"></div>', `<div class="panel" id="cres">${els.cres.innerHTML}</div>`);
  }
  const tabs = call('tabsHtml()');
  return { html, tabs };
}

const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 8);
const assets = { css: hash(css), js: hash(appJs), data: hash(dataJs), ...Object.fromEntries(Object.entries(EXTRA).map(([k, v]) => ['x_' + k, hash(v)])) };

await rm(DIST, { recursive: true, force: true });
await mkdir(join(DIST, 'assets'), { recursive: true });
await writeFile(join(DIST, 'assets/app.js'), appJs);
await writeFile(join(DIST, 'assets/style.css'), css);
await writeFile(join(DIST, 'assets/data.js'), dataJs);
for (const [k, v] of Object.entries(EXTRA)) await writeFile(join(DIST, `assets/data-${k}.js`), v);
await cp(join(ROOT, 'static'), DIST, { recursive: true });

const pages = []; // [route, lastmod]
async function emit(route, meta, lastmod, extra = {}) {
  const { html, tabs } = renderRoute(route, extra.postHtml);
  const out = join(DIST, pathOf(route), 'index.html');
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, page({ route, html, tabs, assets, ...meta, pre: !!extra.postHtml }));
  if (!meta.noindex) pages.push([route, lastmod || TODAY]);
}

const site = '받는돈';
const draws = [...lotto].sort((a, b) => b.round - a.round);
const L = draws[0];
const pen = [...pension].sort((a, b) => b.round - a.round);
const P = pen[0];
const nums = (d) => d.numbers.join(' ');
const won = (n) => {
  const e = Math.floor(n / 1e8), m = Math.floor((n % 1e8) / 1e4);
  return ((e ? `${e}억 ` : '') + (m ? `${m.toLocaleString()}만` : '')).trim() + '원';
};

// 홈
await emit('home', {
  title: `${site} | 세금 떼고 진짜 받는 돈 계산기`,
  desc: '연봉 실수령액, 퇴직금, 주휴수당, 프리랜서 3.3%, 카드 결제 입금액부터 로또·연금복권 당첨금 실수령액까지. 숫자만 넣으면 통장에 들어올 금액을 바로 계산해요.',
  jsonld: { '@context': 'https://schema.org', '@type': 'WebSite', name: site, alternateName: 'getdon24', url: SITE + '/' },
});

// 계산기
const calcs = JSON.parse(call('JSON.stringify(ALLC().map(c=>({id:c.id,title:c.title,label:c.label,hidden:!!c.hidden})))'));
const faqs = JSON.parse(call('JSON.stringify(CALC_FAQ)'));
for (const c of calcs) {
  const faq = faqs[c.id] || [];
  await emit(`c-${c.id}`, {
    title: `${CALC_SEO[c.id] || c.title} | ${site}`,
    desc: CALC_DESC[c.id] || `${c.title}. 숫자만 넣으면 바로 계산해요.`,
    jsonld: faq.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) } : null,
  });
  if (!CALC_DESC[c.id]) console.warn(`  주의: ${c.id} 계산기의 검색 설명(CALC_DESC)이 없어요`);
}

// 로또
await emit('lotto', { title: `로또 ${L.round}회 당첨번호 ${nums(L)} · 1등 판매점 | ${site}`, desc: `${L.date} 추첨 로또 ${L.round}회 당첨번호 ${nums(L)}, 보너스 ${L.bonus}. 1등 ${L.ranks[0][1]}명 1인당 ${won(L.ranks[0][0])}. 1등 판매점, 지역별 명당, 실수령액 계산기까지.` }, L.date);
for (const b of DATA.benefits) {
  const amt = b.amount ? ` ${b.amount}.` : '';
  await emit('n-' + b.id, { title: `${b.name} 신청 방법·대상·금액 | ${site}`, desc: `${b.name}:${amt} ${b.who || ''}`.slice(0, 150), jsonld: b.steps ? { '@context': 'https://schema.org', '@type': 'HowTo', name: `${b.name} 신청 방법`, step: b.steps.map((t, i) => ({ '@type': 'HowToStep', position: i + 1, text: t })) } : null });
}
await emit('check', { title: `받을 돈 진단 - 질문 5개로 지원금·수당·환급 찾기 | ${site}`, desc: '나이, 하는 일, 아이, 집, 가구 형편 5가지만 고르면 받을 수 있을지 모르는 정부 지원금·수당·세금 환급을 골라 드려요. 개인정보는 묻지 않아요.' });
await emit('month', { title: `이번 달 꼭 챙길 돈 - 마감 임박 신청·신고·세액공제 | ${site}`, desc: '연말정산 세액공제, 지원금 신청 마감, 세금 신고 기한처럼 한 달 안에 꼭 챙겨야 할 돈을 날짜순으로 모았어요. 공식 근거와 바로가기를 함께 알려 드려요.' });
await emit('lmap', { title: `로또 1등 지도 - 시군구별 1등 판매점 | ${site}`, desc: `${places.from}회부터 ${places.to}회까지 로또 1등이 나온 판매점을 시·도, 시·군·구 지도로 모았어요. 지역을 누르면 그곳 1등 판매점을 볼 수 있어요.` }, L.date);
await emit('all', { title: `로또 전체 회차 당첨번호 1회~${L.round}회 | ${site}`, desc: `로또 6/45 1회부터 ${L.round}회까지 모든 회차의 당첨번호와 보너스 번호를 한눈에 볼 수 있어요.` }, L.date);
for (const d of draws) {
  const [prize, win] = d.ranks[0];
  await emit(`draw${d.round}`, {
    title: `로또 ${d.round}회 당첨번호 ${nums(d)} + ${d.bonus} | ${site}`,
    desc: `${d.date} 추첨 로또 ${d.round}회 당첨번호는 ${nums(d)}, 보너스 ${d.bonus}. ${win ? `1등 ${win}명, 1인당 ${won(prize)}.` : '1등 당첨자 없음.'} 번호 합계, 홀짝, 구간 분석까지 정리했어요.`,
  }, d.date);
}

// 연금복권
await emit('pension', { title: `연금복권720+ ${P.round}회 당첨번호 ${P.group}조 ${P.number} · 실수령액 | ${site}`, desc: `${P.date} 추첨 연금복권720+ ${P.round}회 1등 ${P.group}조 ${P.number}, 보너스 ${P.bonus}. 1등 월 700만원 실수령액과 1등·2등 동시 당첨 계산기까지.` }, P.date);
await emit('penall', { title: `연금복권720+ 전체 회차 당첨번호 | ${site}`, desc: `연금복권720+ 1회부터 ${P.round}회까지 1등 당첨번호와 보너스 번호를 모두 볼 수 있어요.` }, P.date);

// 마감 임박 혜택
await emit('benefits', { title: `마감 임박 혜택 - 정부 지원사업·기업 이벤트 | ${site}`, desc: '소상공인, 직장인, 청년, 육아 가정이 지금 신청할 수 있는 정부 지원사업과 은행·카드사 이벤트를 마감이 가까운 순서로 모았어요.' });

// 인생 이벤트
const LIFE_SEO = { marriage: ['결혼할 때 받을 돈·할 일 - 결혼세액공제·혼인신고', '혼인신고, 결혼세액공제 50만원, 배우자 공제, 신혼부부 대출까지 결혼할 때 챙길 돈과 할 일을 순서대로 정리했어요.'],
  birth: ['출산할 때 받을 돈 - 부모급여·아동수당·첫만남이용권', '출생신고 때 한 번에 신청하는 부모급여, 아동수당, 첫만남이용권과 육아휴직급여, 자녀장려금까지 출산 때 받을 돈을 모았어요.'],
  moving: ['이사할 때 할 일·받을 돈 - 전입신고·대출·월세 지원', '대출 상환액 계산, 중도상환수수료, 14일 안에 하는 전입신고, 확정일자, 청년월세 지원까지 이사 때 챙길 것을 정리했어요.'],
  resign: ['퇴사할 때 받을 돈 - 퇴직금·실업급여·연말정산', '퇴직금, 남은 연차수당, 실업급여, 국민취업지원제도, 건강보험, 5월 종합소득세까지 퇴사 전후로 챙길 돈을 순서대로 정리했어요.'],
  retire: ['은퇴 준비 체크리스트 - 국민연금·IRP·노후자금', '국민연금 예상액 확인, 노후자금 모으기 계산, 퇴직금 IRP, 기초연금까지 은퇴 전에 확인할 것을 모았어요.'] };
await emit('life', { title: `인생 이벤트별 받을 돈 - 결혼·출산·이사·퇴사·은퇴 | ${site}`, desc: '결혼, 출산, 이사, 퇴사, 은퇴 때 받을 수 있는 돈과 해야 할 일을 시기별로 모았어요.' });
for (const [k, [t, d]] of Object.entries(LIFE_SEO)) await emit(`l-${k}`, { title: `${t} | ${site}`, desc: d });

// 공식 사이트 바로가기
await emit('links', { title: `공식 사이트 바로가기 - 홈택스·정부24·복지로·고용24·국민연금 | ${site}`, desc: '홈택스, 위택스, 정부24, 복지로, 고용24, 국민연금, 건강보험, 인터넷등기소처럼 돈과 관련된 조회·신청을 하는 공식 사이트 주소를 분야별로 모았어요.' });

// 받은 돈 기록장 (브라우저에만 저장)
await emit('record', { title: `받은 돈 기록장 - 월급·지원금·환급금 한 해 합계 | ${site}`, desc: '월급, 지원금, 환급금, 이자처럼 받은 돈을 적어 두면 월별·분류별 합계를 보여 드려요. 기록은 내 브라우저에만 저장돼요.' });

// 숨은 돈 찾기
await emit('hidden', { title: `숨은 돈 찾기 - 휴면예금·미환급금·카드포인트 조회 한 번에 | ${site}`, desc: '휴면예금, 잠자는 보험금, 카드포인트, 미수령 주식, 통신 미환급액, 미환급 공과금까지 숨은 돈을 찾는 공식 조회 사이트를 한곳에 모았어요.' });

// 신고·신청 마감 달력 + 캘린더 구독 파일
await emit('deadlines', { title: `신고·신청 마감 달력 - 종합소득세·부가세·근로장려금 | ${site}`, desc: '종합소득세, 부가가치세, 근로장려금, 자동차세, 재산세처럼 해마다 돌아오는 신고·신청·납부 마감일을 D-day 순서로 모았어요. 휴대폰 캘린더에 넣으면 3일 전에 알려 줘요.' });
await writeFile(join(DIST, 'deadlines.ics'), icsOf(DATA.deadlines));

// 모든 계산기
await emit('calc', { title: `모든 계산기 - 연봉·퇴직금·실업급여·3.3%·대출·복비 | ${site}`, desc: '연봉 실수령액, 퇴직금, 실업급여, 3.3%, 대출 이자, 복비, 자동차세까지 세금 떼고 실제로 받는 돈을 계산하는 계산기를 분야별로 모았어요.' });

// 받을 돈 찾기
await emit('find', { title: `받을 돈 찾기 - 지원금·수당·환급금 한 번에 | ${site}`, desc: '직장인, 알바, 프리랜서, 육아 중, 구직·퇴사, 청년, 자영업 중 해당하는 걸 고르면 매달 받는 돈, 한 번에 받는 돈, 돌려받는 돈을 모아 보여 드려요.' });

// 게시판
await emit('guide', { title: `정보 게시판 | ${site}`, desc: '급여, 세금, 4대보험, 프리랜서, 복권 당첨금까지 돈과 관련된 정보글을 모았어요.' }, posts[0]?.date);
for (const p of posts) {
  await emit(`b-${p.slug}`, {
    title: `${p.title} | ${site}`, desc: p.excerpt, ogType: 'article',
    jsonld: { '@context': 'https://schema.org', '@type': 'Article', headline: p.title, description: p.excerpt, datePublished: p.date, dateModified: p.date, author: { '@type': 'Organization', name: site }, publisher: { '@type': 'Organization', name: site, logo: { '@type': 'ImageObject', url: `${SITE}/apple-touch-icon.png` } }, image: `${SITE}/og-image.png`, mainEntityOfPage: SITE + pathOf(`b-${p.slug}`) },
  }, p.date, { postHtml: p.html });
}

// 소개·문의·개인정보
await emit('about', { title: `소개 | ${site}`, desc: '받는돈은 세금과 공제를 떼고 실제로 손에 들어오는 돈을 계산해 주는 사이트예요.' });
await emit('contact', { title: `문의 | ${site}`, desc: '받는돈에 잘못된 정보나 추가했으면 하는 계산기를 알려 주세요.' });
await emit('method', { title: `계산 기준과 출처 | ${site}`, desc: '받는돈 계산기가 쓰는 4대보험 요율, 3.3% 원천징수, 최저임금, 복권 세금 기준과 출처, 계산의 한계를 정리했어요.' });
await emit('terms', { title: `이용약관·면책 | ${site}`, desc: '받는돈 이용약관과 면책 안내예요. 계산 결과는 참고용 추정치예요.' });
await emit('privacy', { title: `개인정보처리방침 | ${site}`, desc: '받는돈의 개인정보처리방침이에요.' });

// 404
{
  const { tabs } = renderRoute('home');
  const html = `<h1 class="h1">페이지를 찾을 수 없어요</h1><p class="note">주소가 바뀌었거나 없는 페이지예요.</p><div class="menu2" style="margin-top:16px"><a href="/"><span class="mt"><b>홈으로</b></span></a><a href="/calc/"><span class="mt"><b>계산기</b></span></a><a href="/lotto/"><span class="mt"><b>로또</b></span></a></div>`;
  await writeFile(join(DIST, '404.html'), page({ route: 'notfound', title: `페이지를 찾을 수 없어요 | ${site}`, desc: '', html, tabs, assets, noindex: true }).replace('<script src="/assets/app.js', '<script data-skip src="/assets/app.js').replace(/<script data-skip[^>]*><\/script>/, ''));
}

// sitemap, robots, ads.txt, 캐시 설정
await writeFile(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(([r, d]) => `<url><loc>${SITE}${pathOf(r)}</loc><lastmod>${d}</lastmod></url>`).join('\n')}\n</urlset>\n`);
await writeFile(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
if (config.adsenseClient) await writeFile(join(DIST, 'ads.txt'), `google.com, ${config.adsenseClient.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`);
// 옛 주소는 합쳐진 계산기로 301 이동
await writeFile(join(DIST, '_redirects'), '/calc/freelance-reverse/ /calc/freelance/ 301\n/calc/freelance-reverse /calc/freelance/ 301\n');
// 페이지(HTML)는 늘 최신본을 확인하고, 버전이 붙은 /assets/ 만 오래 저장 (예전 회차가 보이던 문제 방지)
await writeFile(join(DIST, '_headers'), `/*\n  Cache-Control: public, max-age=0, must-revalidate\n/deadlines.ics\n  Content-Type: text/calendar; charset=utf-8\n/assets/*\n  ! Cache-Control\n  Cache-Control: public, max-age=31536000, immutable\n/*.png\n  ! Cache-Control\n  Cache-Control: public, max-age=86400\n`);
await writeFile(join(DIST, 'rss.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>받는돈 정보 게시판</title><link>${SITE}/blog/</link><description>급여·세금·복권 정보글</description>\n${posts.slice(0, 30).map((p) => `<item><title>${esc(p.title)}</title><link>${SITE}${pathOf('b-' + p.slug)}</link><guid>${SITE}${pathOf('b-' + p.slug)}</guid><pubDate>${new Date(p.date + 'T09:00:00+09:00').toUTCString()}</pubDate><description>${esc(p.excerpt)}</description></item>`).join('\n')}\n</channel></rss>\n`);

console.log(`완료 (${TODAY} 기준): 페이지 ${pages.length}개 · 계산기 ${calcs.length} · 로또 ${draws.length}회 · 연금복권 ${pen.length}회 · 글 ${posts.length}개`);
