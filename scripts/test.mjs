// 저장된 데이터가 업데이트 스크립트의 검증 규칙을 모두 통과하는지 확인한다.
//   node scripts/test.mjs
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toDraw, checkDraw } from './update-lotto.mjs';
import { toPension } from './update-pension.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0;
const bad = (m) => { fail++; console.error('✗', m); };

// 1) 로또: 모든 회차가 검증 통과 (1~261회는 1등 자동/수동 정보 없음)
const lotto = JSON.parse(await readFile(join(ROOT, 'data/lotto.json'), 'utf8'));
lotto.forEach((d, i) => {
  const why = checkDraw(d, lotto[i - 1]);
  if (why && !(d.round < 262 && why.includes('1억원'))) bad(`로또 ${d.round}회: ${why}`);
});
console.log(`로또 ${lotto.length}회 검사`);

// 2) 공식 응답 형식 → 저장 형식 변환
const raw = { ltEpsd: 1246, ltRflYmd: '20261017', tm1WnNo: 28, tm2WnNo: 16, tm3WnNo: 22, tm4WnNo: 23, tm5WnNo: 24, tm6WnNo: 27, bnsWnNo: 6,
  rnk1WnAmt: 1881025430, rnk1WnNope: 16, rnk2WnAmt: 78376060, rnk2WnNope: 64, rnk3WnAmt: 1497334, rnk3WnNope: 3350, rnk4WnAmt: 50000, rnk4WnNope: 155108, rnk5WnAmt: 5000, rnk5WnNope: 2608922,
  winType1: 11, winType2: 4, winType3: 1, rlvtEpsdSumNtslAmt: 60928553620 };
const conv = toDraw(raw);
const d1246 = lotto.find((d) => d.round === 1246); // 변환 확인용 고정 회차 (새 회차가 늘어나도 그대로)
if (JSON.stringify(conv) !== JSON.stringify(d1246)) bad('공식 응답 변환 결과가 저장된 1246회와 달라요');
if (checkDraw({ ...conv, round: 1247, date: '2026-10-24', ranks: conv.ranks.map((r, i) => (i === 4 ? [0, 0] : r)) }, d1246) !== '아직 당첨금 집계 전이에요') bad('집계 전 판별 실패');
if (!checkDraw({ ...conv, numbers: [1, 1, 2, 3, 4, 5] })) bad('중복 번호를 걸러내지 못함');

// 3) 연금복권
const pen = JSON.parse(await readFile(join(ROOT, 'data/pension.json'), 'utf8'));
pen.forEach((p, i) => {
  try { toPension({ psltEpsd: p.round, psltRflYmd: p.date.replace(/-/g, ''), wnBndNo: p.group, wnRnkVl: p.number, bnsRnkVl: p.bonus }); } catch (e) { bad(`연금 ${e.message}`); }
  if (i && p.round !== pen[i - 1].round + 1) bad(`연금 ${p.round}회 앞 회차 누락`);
});
console.log(`연금복권 ${pen.length}회 검사`);

// 4) 판매점 파일
const files = await readdir(join(ROOT, 'data/stores'));
for (const f of files) {
  const { round, stores } = JSON.parse(await readFile(join(ROOT, 'data/stores', f), 'utf8'));
  if (`${round}.json` !== f) bad(`${f} 회차 불일치`);
  const d = lotto.find((x) => x.round === round);
  if (d && stores.length > d.ranks[0][1]) bad(`${round}회 판매점 수가 1등 수보다 많음`);
}
console.log(`판매점 ${files.length}개 회차 검사`);

// 5) 계산기 정답 예시: 숫자가 바뀌면 여기서 걸려요. 값은 공식 표·급여명세서 방식으로 직접 검산한 것.
{
  const vm = await import('node:vm');
  const appJs = await readFile(join(ROOT, 'src/app.js'), 'utf8');
  const wtax = JSON.parse(await readFile(join(ROOT, 'data/wage-tax-2026-03.json'), 'utf8'));
  const DATA = { draws: [], pension: [], places: {}, config: {}, posts: [], support: [], benefits: [], deadlines: [], hidden: { groups: [] }, wtax };
  const ctx = { window: { DATA, __PRERENDER: 1 }, document: { getElementById: () => ({}), addEventListener() {} }, location: { pathname: '/', href: '/', search: '' },
    history: { replaceState() {} }, localStorage: { getItem: () => null, setItem() {} }, setInterval() {}, setTimeout() {}, scrollTo() {}, addEventListener() {},
    console, Date, Math, JSON, Object, Array, String, Number, Set, Map, RegExp, encodeURIComponent, decodeURIComponent, Intl };
  ctx.window.window = ctx.window;
  vm.createContext(ctx); vm.runInContext(appJs, ctx);
  const run = (id, v) => JSON.parse(vm.runInContext(`JSON.stringify(calcs.find(c=>c.id==${JSON.stringify(id)}).run(${JSON.stringify(v)}))`, ctx));
  const row = (r, label) => (r.sub.find(([a]) => a.startsWith(label)) || [])[1];
  const CASES = [
    // 연봉 4천만원·비과세 20만원·1명: 국민연금 기준소득월액 천원 미만 절사, 보험료 10원 미만 절사, 간이세액표 84,620원
    ['salary', { annual: '4000', nonTaxable: '20', dependents: '1', kids: '0' }, { '국민연금': '148,810원', '건강보험': '112,640원', '장기요양': '14,800원', '고용보험': '28,190원', '소득세': '84,620원', '지방소득세': '8,460원', '월 실수령액': '2,935,813원' }],
    // 간이세액표 예시 (홈택스): 월 350만원, 4명, 자녀 2명 → 3,510원
    ['salary', { annual: '4200', nonTaxable: '0', dependents: '4', kids: '2' }, { '소득세': '3,510원' }],
    ['loan', { p: '100000000', pu: 'y', n: '30', rate: '4.5', how: 'eq' }, { main: '매달 506,685원' }],
    ['savings', { m: '1000000', pu: 'm', n: '12', rate: '3.5', how: 's', tax: 'normal' }, { '세전 이자': '227,500원', '이자소득세': '− 31,850원', '지방소득세': '− 3,180원' }],
    ['deposit', { p: '10000000', pu: 'y', n: '1', rate: '3', how: 's', tax: 'normal' }, { '세후 이자': '253,800원' }],
    ['vat', { mode: 'tot', amt: '1100000' }, { '공급가액': '1,000,000원', '부가세 10%': '100,000원' }],
    ['pyeong', { mode: 'm2', x: '84' }, { '평': '25.41평' }],
    ['age', { birth: '2000-12-01', base: '2026-11-19' }, { '만 나이': '25세' }],
    ['percent', { mode: 'chg', a: '3', b: '4' }, { '변화율': '+33.33%' }],
    // 중개보수: 월세 1,000/50 → 6천만원 × 0.4% = 24만원, 500/30 → 2,600만원 × 0.5% = 13만원, 매매 5억 × 0.4% = 200만원
    ['brokerage', { mode: 'monthly', house: 'home', dep2: '1000', rent: '50' }, { '최대 중개보수': '240,000원' }],
    ['brokerage', { mode: 'monthly', house: 'home', dep2: '500', rent: '30' }, { '최대 중개보수': '130,000원' }],
    ['brokerage', { mode: 'sale', house: 'home', price: '50000' }, { '최대 중개보수': '2,000,000원' }],
    // 자동차세: 1,998cc × 200원 = 399,600원, 교육세 30% 119,880원 (1·2년차)
    ['car-tax', { fuel: 'ice', cc: '1998', year: String(new Date().getFullYear()) }, { '자동차세': '399,600원', '지방교육세': '119,880원' }],
    // HUG: 아파트 보증금 3억·주택 5억·선순위 0 → 부채비율 66.7% → 연 0.107% × 2년 = 642,000원
    ['jeonse-guarantee', { dep: '30000', apt: 'apt', price: '50000', prior: '0', yrs: '2', dc: '0' }, { '보증료 (계약 기간 전체)': '642,000원' }],
    // 청년미래적금 금융위 예시: 월 50만원 × 36 = 1,800만원, 일반형 기여금 108만원, 우대형 216만원
    ['youth-future', { m: '500000', type: '6', rate: '7' }, { '넣은 돈 (36개월)': '18,000,000원', '정부 기여금 (6%)': '+ 1,080,000원' }],
    ['youth-future', { m: '500000', type: '12', rate: '7' }, { '정부 기여금 (12%)': '+ 2,160,000원' }],
    ['car-tax', { fuel: 'ev', year: String(new Date().getFullYear()) }, { '1년 합계': '130,000원' }],
  ];
  for (const [id, v, exp] of CASES) {
    const r = run(id, v);
    for (const [k, want] of Object.entries(exp)) {
      const got = k === 'main' ? r.main : row(r, k);
      if (got !== want) bad(`${id} ${k}: ${got} (예상 ${want})`);
    }
  }
  const wage = vm.runInContext(`Math.round(RATES.minimumWage*209)`, ctx);
  if (wage !== 2156880) bad(`최저임금 월 환산 ${wage}`);
  console.log(`계산기 예시 ${CASES.length}건 검사`);
}

if (fail) { console.error(`실패 ${fail}건`); process.exit(1); }
console.log('모두 통과');
