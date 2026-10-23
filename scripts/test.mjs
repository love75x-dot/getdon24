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
if (JSON.stringify(conv) !== JSON.stringify(lotto.at(-1))) bad('공식 응답 변환 결과가 저장된 1246회와 달라요');
if (checkDraw({ ...conv, round: 1247, date: '2026-10-24', ranks: conv.ranks.map((r, i) => (i === 4 ? [0, 0] : r)) }, lotto.at(-1)) !== '아직 당첨금 집계 전이에요') bad('집계 전 판별 실패');
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

if (fail) { console.error(`실패 ${fail}건`); process.exit(1); }
console.log('모두 통과');
