// 로또 6/45 당첨번호와 1등 판매점을 동행복권 공식 사이트에서 받아 data/ 에 반영한다.
//
//   node scripts/update-lotto.mjs           새 회차만 받기 (매주 자동 실행)
//   node scripts/update-lotto.mjs --full    1회부터 전부 다시 받아 기존 데이터와 비교·교체 (오래 걸림, 약 40분)
//
// 공식 자료 (2026년 개편된 동행복권 사이트가 화면에서 쓰는 주소)
//   당첨결과   /lt645/selectPstLt645Info.do?srchLtEpsd=회차
//   1등 판매점 /wnprchsplcsrch/selectLtWnShp.do?srchWnShpRnk=1&srchLtEpsd=회차
//
// 검증을 하나라도 통과하지 못하면 아무것도 저장하지 않고 실패로 끝난다(잘못된 숫자가 사이트에 올라가지 않게).

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getJson, ymd8, dayOfWeek, daysBetween, writeIfChanged, jsonLines } from './lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOTTO = join(ROOT, 'data/lotto.json');
const STORES = join(ROOT, 'data/stores');
const FIRST_STORE_ROUND = 262; // 동행복권은 262회부터 1등 판매점을 공개
const METHOD = { 자동: '자동', 수동: '수동', 반자동: '반자동' };
const REGION = (r) => (['전남광주', '전남', '광주'].includes(r) ? '광주·전남' : r);

export function toDraw(raw) {
  const date = ymd8(raw.ltRflYmd);
  const n = (k) => Number(raw[k]);
  return {
    round: n('ltEpsd'),
    date,
    numbers: [1, 2, 3, 4, 5, 6].map((i) => n(`tm${i}WnNo`)).sort((a, b) => a - b),
    bonus: n('bnsWnNo'),
    ranks: [1, 2, 3, 4, 5].map((k) => [n(`rnk${k}WnAmt`), n(`rnk${k}WnNope`)]),
    firstMethods: n('ltEpsd') >= FIRST_STORE_ROUND ? [n('winType1'), n('winType2'), n('winType3')] : null,
    sales: n('rlvtEpsdSumNtslAmt'),
  };
}

// 문제가 없으면 null, 있으면 이유
export function checkDraw(d, prev) {
  const all = [...d.numbers, d.bonus];
  if (!Number.isInteger(d.round) || d.round < 1) return '회차 번호가 이상해요';
  if (all.some((x) => !Number.isInteger(x) || x < 1 || x > 45) || new Set(all).size !== 7) return '당첨번호가 1~45 사이 서로 다른 7개가 아니에요';
  if (!d.date) return '추첨일 형식이 이상해요';
  if (dayOfWeek(d.date) !== 6) return `추첨일 ${d.date} 이 토요일이 아니에요`;
  if (d.ranks.some(([p, w]) => !Number.isFinite(p) || !Number.isFinite(w) || p < 0 || w < 0)) return '당첨금·당첨자 수가 이상해요';
  if (!d.ranks[4][1]) return '아직 당첨금 집계 전이에요'; // 5등은 매회 수십만 명 → 0 이면 집계 전
  if (d.ranks[0][1] && d.ranks[0][0] < 1e8) return '1등 당첨금이 1억원보다 적어요';
  if (d.firstMethods && d.firstMethods.some((x) => !Number.isFinite(x))) return '1등 자동/수동 수가 이상해요';
  if (d.firstMethods && d.firstMethods.reduce((a, b) => a + b, 0) !== d.ranks[0][1]) return '1등 자동+수동+반자동 합이 1등 당첨자 수와 달라요';
  if (prev) {
    if (d.round !== prev.round + 1) return `${prev.round}회 다음이 ${d.round}회예요`;
    const gap = daysBetween(prev.date, d.date);
    if (gap < 7 || gap > 21) return `직전 회차와 추첨일 간격이 ${gap}일이에요`;
  }
  return null;
}

async function fetchDraw(round) {
  const json = await getJson('/lt645/selectPstLt645Info.do', round ? { srchLtEpsd: round } : {}, { referer: '/lt645/result' });
  const raw = json?.data?.list?.[0];
  if (!raw) return null; // 아직 추첨 전
  if (round && Number(raw.ltEpsd) !== round) return null; // 없는 회차를 물으면 최신 회차가 오는 경우
  return toDraw(raw);
}

async function fetchStores(round) {
  const list = [];
  for (let page = 1; page < 20; page++) {
    const json = await getJson('/wnprchsplcsrch/selectLtWnShp.do', { srchWnShpRnk: 1, srchLtEpsd: round, srchShpLctn: '', pageNum: page, recordCountPerPage: 50 }, { referer: '/wnprchsplcsrch/home' });
    const data = json?.data;
    if (!data || !Array.isArray(data.list)) throw new Error(`${round}회 판매점 응답 형식이 달라요`);
    list.push(...data.list);
    if (data.list.length < 50 || list.length >= Number(data.total || 0)) break;
  }
  // 영업 중(정상)인 판매점만 담는다. 1등 1건당 1줄이라 같은 판매점이 여러 번 나올 수 있다.
  return list.filter((s) => s.status === '정상').map((s) => ({
    name: String(s.shpNm || '').trim(),
    address: String(s.befAddr || '').trim(),
    region: REGION(String(s.region || '').trim()),
    method: METHOD[String(s.atmtPsvYnTxt || '').trim()] || String(s.atmtPsvYnTxt || '').trim(),
    id: String(s.ltShpId || ''),
  }));
}

function checkStores(round, stores, draw) {
  if (stores.some((s) => !s.name || !s.region)) return '판매점 이름이나 지역이 비어 있어요';
  if (draw && stores.length > draw.ranks[0][1]) return `판매점 ${stores.length}곳이 1등 ${draw.ranks[0][1]}건보다 많아요`;
  return null;
}

async function main() {
  const full = process.argv.includes('--full');
  const draws = JSON.parse(await readFile(LOTTO, 'utf8')).sort((a, b) => a.round - b.round);
  const byRound = new Map(draws.map((d) => [d.round, d]));
  const errors = [];
  let added = 0, changed = 0;

  // 1) 당첨번호
  const latestOfficial = await fetchDraw(null);
  if (!latestOfficial) throw new Error('동행복권 최신 회차를 받지 못했어요');
  const from = full ? 1 : draws.at(-1).round + 1;
  for (let r = from; r <= latestOfficial.round; r++) {
    const d = r === latestOfficial.round ? latestOfficial : await fetchDraw(r);
    if (!d) { errors.push(`${r}회: 응답 없음`); break; }
    const prev = byRound.get(r - 1);
    const why = checkDraw(d, prev);
    if (why) {
      if (why.includes('집계 전') && r === latestOfficial.round) { console.log(`${r}회: ${why} → 다음 실행 때 다시 확인`); break; }
      errors.push(`${r}회: ${why}`);
      break;
    }
    const old = byRound.get(r);
    if (!old) { added++; console.log(`${r}회 추가: ${d.numbers.join(' ')} + ${d.bonus}`); }
    else if (JSON.stringify(old) !== JSON.stringify(d)) { changed++; console.log(`${r}회 공식 자료와 달라 교체`); }
    byRound.set(r, d);
  }
  if (errors.length) throw new Error('당첨번호 검증 실패, 저장하지 않았어요:\n' + errors.join('\n'));
  const next = [...byRound.values()].sort((a, b) => a.round - b.round);
  if (await writeIfChanged(LOTTO, jsonLines(next))) console.log(`data/lotto.json 저장 (추가 ${added}, 교체 ${changed})`);

  // 2) 1등 판매점: 파일이 없는 회차 (전체 모드면 전부)
  const have = new Set((await readdir(STORES)).map((f) => +f.replace('.json', '')));
  const last = next.at(-1).round;
  for (let r = FIRST_STORE_ROUND; r <= last; r++) {
    if (!full && have.has(r)) continue;
    const stores = await fetchStores(r);
    if (!stores.length) {
      if (r === last) { console.log(`${r}회 1등 판매점이 아직 공개 전이에요 → 다음 실행 때 다시 확인`); continue; }
      console.log(`${r}회: 영업 중인 1등 판매점이 없어요`);
    }
    const why = checkStores(r, stores, byRound.get(r));
    if (why) throw new Error(`${r}회 판매점 검증 실패: ${why}`);
    if (await writeIfChanged(join(STORES, `${r}.json`), JSON.stringify({ round: r, stores }, null, 1) + '\n')) console.log(`${r}회 판매점 ${stores.length}건 저장`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error('실패:', e.message); process.exit(1); });
}
