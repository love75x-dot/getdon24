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
  return { slug, title: meta.title, cat: meta.category, date: meta.date, excerpt: meta.excerpt, calc: meta.calc || '', min: Math.max(1, Math.round(chars / 500)), html };
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
const isInternet = (s) => s.id === '51100000' || s.name.includes('인터넷');
async function loadPlaces(latestRound) {
  const dir = join(ROOT, 'data/stores');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
  const rounds = files.map((f) => +f.replace('.json', '')).sort((a, b) => a - b);
  const region = new Map(), shop = new Map();
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
  };
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
<meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/og-image.png"><meta property="og:locale" content="ko_KR">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1e2a5a">
<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/favicon.png" type="image/png"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/manifest.webmanifest"><meta name="apple-mobile-web-app-title" content="받는돈"><meta name="mobile-web-app-capable" content="yes">
${verify}
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css">
<link rel="stylesheet" href="/assets/style.css?v=${assets.css}">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}
${ads}${ga}
</head>
<body>
<header><div class="wrap" style="padding-bottom:0"><div class="hd"><div class="logo"><a href="/">받는<b>돈</b></a></div><small id="hsub"></small></div></div></header>
<main class="wrap" id="app">${html}</main>
<nav class="tabbar" id="tabs">${tabs}</nav>
<script>window.__ROUTE=${JSON.stringify(route)};${pre ? 'window.__PRE=1;' : ''}</script>
<script src="/assets/data.js?v=${assets.data}"></script>
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
  if (t.startsWith('draw')) return `/lotto/${t.slice(4)}/`;
  if (t === 'pension') return '/pension/';
  if (t === 'penall') return '/pension/all/';
  if (t === 'guide') return '/blog/';
  if (t.startsWith('b-')) return `/blog/${t.slice(2)}/`;
  return `/${t}/`;
}

// 계산기별 검색 설명 (검색 결과·카톡 미리보기에 나오는 문장)
const CALC_DESC = {
  salary: '연봉을 넣으면 4대보험과 소득세를 뗀 월 실수령액을 바로 계산해요. 국민연금, 건강보험, 고용보험, 소득세가 각각 얼마인지도 보여 드려요.',
  'salary-compare': '두 회사 연봉 조건을 넣으면 세금과 4대보험을 뗀 월 실수령액이 얼마나 차이 나는지 비교해요. 이직 연봉 협상 전에 써 보세요.',
  insurance: '월급을 넣으면 국민연금, 건강보험, 장기요양보험, 고용보험 공제액을 2026년 요율로 계산해요.',
  severance: '최근 3개월 급여와 근속기간을 넣으면 법정 퇴직금을 계산해요. 1일 평균임금 계산 과정까지 보여 드려요.',
  'annual-leave': '통상시급과 남은 연차 일수를 넣으면 받을 수 있는 연차수당을 계산해요.',
  'weekly-rest': '시급과 주당 근무시간을 넣으면 주휴수당을 계산해요. 주 15시간 미만이면 대상이 아닌 이유도 알려 드려요.',
  freelance: '프리랜서 3.3% 계산기예요. 계약 금액을 넣으면 실수령액을, 받은 금액을 넣으면 계약 금액을 거꾸로 계산해요. 소득세 3%와 지방소득세 0.3%를 나눠 보여 주고, 10원 단위 버림과 소액부징수까지 반영해요.',
  'tax-refund': '작년 프리랜서 소득과 업종을 넣으면 5월 종합소득세 신고 때 환급받을지, 더 낼지 미리 계산해요.',
  'labor-cost': '직원 월급을 넣으면 사업주가 부담하는 4대보험까지 더한 실제 총 인건비를 계산해요.',
  'minwage-check': '월급과 월 근무시간을 넣으면 최저임금 위반인지 바로 확인해요. 주휴시간 포함 기준으로 계산해요.',
  'daily-worker-tax': '일당과 근무일수를 넣으면 일용직 근로소득세와 실제 지급액을 계산해요. 하루 15만원 공제를 반영해요.',
  'card-fee': '손님이 카드로 결제한 금액을 넣으면 카드 수수료를 빼고 사업자 통장에 들어오는 돈, 나중에 낼 부가세까지 계산해요.',
  'split-14h': '주 15시간 1명 고용과 주 14시간 쪼개기 고용의 월 인건비를 비교해요. 주휴수당, 4대보험, 퇴직금 차이와 실제 시간당 비용까지 보여 드려요.',
  'lotto-tax': '로또 당첨금을 넣으면 세금을 뗀 실수령액을 계산해요. 3억까지 22%, 넘는 부분 33%를 단계별로 보여 드려요.',
  'pension-tax': '연금복권720+ 1등, 2등, 1등과 2등 동시 당첨까지 세금 22%를 뗀 매달 실수령액과 총액을 계산해요.',
};

// 검색 결과 <title>: 짧은 화면 이름 뒤에 검색어를 붙인다 (없으면 화면 이름 그대로)
const CALC_SEO = {
  freelance: '3.3% 계산기 - 프리랜서 원천징수·역산',
  insurance: '4대보험 계산기 - 국민연금·건강보험·고용보험 공제액',
  'tax-refund': '종합소득세 환급 계산기 - 5월 프리랜서 환급액 예측',
  'labor-cost': '인건비 계산기 - 사업주 4대보험 포함 총 인건비',
  'minwage-check': '최저임금 계산기 - 월급 최저임금 위반 확인',
  'card-fee': '카드 수수료 계산기 - 카드 결제 입금액·부가세',
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

const DATA = {
  draws: lotto.map((d) => [d.round, d.date, d.numbers, d.bonus, d.ranks[0][0], d.ranks[0][1], ...(d.firstMethods || [null, null, null]), d.sales]),
  pension: pension.map((p) => [p.round, p.date, p.group, p.number, p.bonus]),
  places,
  config: { email: config.email, siteUrl: SITE },
  posts: posts.map(({ html, ...meta }) => meta),
};

// 화면 함수 실행 준비
const appJs = await readFile(join(ROOT, 'src/app.js'), 'utf8');
const css = await readFile(join(ROOT, 'src/style.css'), 'utf8');
const dataJs = `window.DATA=${JSON.stringify(DATA)};\n`;
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
const assets = { css: hash(css), js: hash(appJs), data: hash(dataJs) };

await rm(DIST, { recursive: true, force: true });
await mkdir(join(DIST, 'assets'), { recursive: true });
await writeFile(join(DIST, 'assets/app.js'), appJs);
await writeFile(join(DIST, 'assets/style.css'), css);
await writeFile(join(DIST, 'assets/data.js'), dataJs);
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
await emit('calc', { title: `실수령액 계산기 모음 ${calcs.filter((c) => !c.hidden).length}종 | ${site}`, desc: `연봉, 4대보험, 퇴직금, 주휴수당, 3.3% 계산·역산, 카드 수수료, 로또 세금까지 ${calcs.filter((c) => !c.hidden).length}가지 계산기를 한곳에 모았어요.` });
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
await writeFile(join(DIST, '_headers'), `/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/*.png\n  Cache-Control: public, max-age=86400\n`);
await writeFile(join(DIST, 'rss.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>받는돈 정보 게시판</title><link>${SITE}/blog/</link><description>급여·세금·복권 정보글</description>\n${posts.slice(0, 30).map((p) => `<item><title>${esc(p.title)}</title><link>${SITE}${pathOf('b-' + p.slug)}</link><guid>${SITE}${pathOf('b-' + p.slug)}</guid><pubDate>${new Date(p.date + 'T09:00:00+09:00').toUTCString()}</pubDate><description>${esc(p.excerpt)}</description></item>`).join('\n')}\n</channel></rss>\n`);

console.log(`완료 (${TODAY} 기준): 페이지 ${pages.length}개 · 계산기 ${calcs.length} · 로또 ${draws.length}회 · 연금복권 ${pen.length}회 · 글 ${posts.length}개`);
