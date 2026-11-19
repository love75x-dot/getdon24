// 계산기·주요 화면마다 공유 이미지(1200×630)를 만든다. 로컬에서만 실행 (Playwright 필요):
//   node scripts/make-og.cjs
// 만든 이미지는 static/og/{이름}.png 로 저장되고, build.mjs 가 있으면 그 이미지를 og:image 로 쓴다.
const { chromium } = require('playwright');
const vm = require('vm'), fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..');
const DATA = { draws: [], pension: [], places: {}, config: {}, posts: [], support: [], benefits: [], deadlines: [], hidden: { groups: [] }, wtax: null };
const ctx = { window: { DATA, __PRERENDER: 1 }, document: { getElementById: () => ({}), addEventListener() {} }, location: { pathname: '/', search: '' }, history: { replaceState() {} }, localStorage: { getItem: () => null, setItem() {} }, setInterval() {}, setTimeout() {}, scrollTo() {}, addEventListener() {}, console, Date, Math, JSON, Object, Array, String, Number, Set, Map, RegExp, encodeURIComponent, decodeURIComponent, Intl };
ctx.window.window = ctx.window; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(R, 'src/app.js'), 'utf8'), ctx);
const list = JSON.parse(vm.runInContext('JSON.stringify(ALLC().map(c=>({k:"c-"+c.id,t:c.title,d:LEAD[c.id]||LEAD[TABAL[c.id]]||"",g:GNL[c.group]||""})))', ctx));
list.push(
  { k: 'find', t: '받을 돈 찾기', d: '지원금·수당·환급금을 한 번에 찾아봐요', g: '받을 돈' },
  { k: 'hidden', t: '숨은 돈 찾기', d: '휴면예금·보험금·카드포인트 공식 조회', g: '받을 돈' },
  { k: 'deadlines', t: '신고·신청 마감 달력', d: '종합소득세·근로장려금·자동차세 마감일', g: '받을 돈' },
  { k: 'benefits', t: '마감 임박 혜택', d: '정부 지원사업을 마감이 가까운 순서로', g: '받을 돈' },
  { k: 'record', t: '받은 돈 기록장', d: '한 해 동안 받은 돈을 모아 보기', g: '받을 돈' },
  { k: 'life', t: '인생 이벤트별 받을 돈', d: '결혼·출산·이사·퇴사·은퇴 때 챙길 돈', g: '받을 돈' },
);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const html = (x) => `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}body{width:1200px;height:630px;background:#f5f6f8;font-family:"Noto Sans CJK KR","Noto Sans KR",sans-serif;padding:56px 64px;display:flex;flex-direction:column}
.top{display:flex;justify-content:space-between;align-items:center;font-size:34px;font-weight:700;color:#1f2329}.top b{color:#0B7A5A}.top span{font-size:26px;font-weight:500;color:#6b7078}
.card{margin-top:40px;flex:1;background:#fff;border-radius:32px;padding:56px 60px;box-shadow:0 2px 4px rgba(16,24,40,.04),0 16px 48px -24px rgba(16,24,40,.18);display:flex;flex-direction:column;justify-content:center}
.g{font-size:28px;font-weight:700;color:#0B7A5A;margin-bottom:18px}h1{font-size:${x.t.length > 14 ? 64 : 76}px;font-weight:900;letter-spacing:-2px;color:#1f2329;line-height:1.15}
p{margin-top:22px;font-size:32px;color:#6b7078;line-height:1.4}</style>
<div class="top"><div>받는<b>돈</b></div><span>getdon24.com</span></div>
<div class="card">${x.g ? `<div class="g">${esc(x.g)}</div>` : ''}<h1>${esc(x.t)}</h1>${x.d ? `<p>${esc(x.d)}</p>` : ''}</div>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  for (const x of list) { await p.setContent(html(x)); await p.screenshot({ path: path.join(R, 'static/og', x.k.replace(/^c-/, '') + '.png') }); }
  await b.close(); console.log(`공유 이미지 ${list.length}개 저장`);
})();
