// 연금복권720+ 당첨번호를 동행복권 공식 사이트에서 받아 data/pension.json 에 반영한다.
//
//   node scripts/update-pension.mjs          새 회차 추가
//   node scripts/update-pension.mjs --full   공식 자료와 다른 회차가 있으면 교체
//
// 공식 자료: /pt720/selectPstPt720WnList.do  (전 회차를 한 번에 돌려준다)

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getJson, ymd8, dayOfWeek, writeIfChanged, jsonLines } from './lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'data/pension.json');

export function toPension(item) {
  const round = Number(item.psltEpsd), date = ymd8(item.psltRflYmd);
  const group = Number(item.wnBndNo), number = String(item.wnRnkVl ?? ''), bonus = String(item.bnsRnkVl ?? '');
  if (!Number.isInteger(round) || round < 1) throw new Error(`회차가 이상해요: ${item.psltEpsd}`);
  if (!date) throw new Error(`${round}회 추첨일 형식이 이상해요`);
  if (dayOfWeek(date) !== 4) throw new Error(`${round}회 추첨일 ${date} 이 목요일이 아니에요`);
  if (!(group >= 1 && group <= 5)) throw new Error(`${round}회 조가 1~5가 아니에요: ${item.wnBndNo}`);
  if (!/^\d{6}$/.test(number)) throw new Error(`${round}회 1등 번호가 6자리가 아니에요`);
  if (bonus && !/^\d{6}$/.test(bonus)) throw new Error(`${round}회 보너스 번호가 6자리가 아니에요`);
  return { round, date, group, number, bonus: bonus || null };
}

async function main() {
  const full = process.argv.includes('--full');
  const json = await getJson('/pt720/selectPstPt720WnList.do', {}, { referer: '/pt720/result' });
  const rows = json?.data?.result;
  if (!Array.isArray(rows) || !rows.length) throw new Error('연금복권 응답에 회차 목록이 없어요');
  const official = rows.map(toPension).sort((a, b) => a.round - b.round);
  official.forEach((d, i) => { if (d.round !== i + official[0].round) throw new Error(`연금복권 회차가 이어지지 않아요 (${d.round}회 근처)`); });

  const mine = new Map(JSON.parse(await readFile(FILE, 'utf8')).map((d) => [d.round, d]));
  let added = 0, diff = [];
  for (const d of official) {
    const old = mine.get(d.round);
    if (!old) { mine.set(d.round, d); added++; console.log(`${d.round}회 추가: ${d.group}조 ${d.number}`); }
    else if (JSON.stringify(old) !== JSON.stringify(d)) diff.push(d);
  }
  if (diff.length && !full) throw new Error(`기존 데이터와 공식 자료가 다른 회차가 있어요: ${diff.map((d) => d.round).join(', ')} (확인 후 --full 로 교체)`);
  diff.forEach((d) => { mine.set(d.round, d); console.log(`${d.round}회 공식 자료로 교체`); });
  const out = [...mine.values()].sort((a, b) => a.round - b.round);
  if (await writeIfChanged(FILE, jsonLines(out))) console.log(`data/pension.json 저장 (추가 ${added}, 교체 ${diff.length})`);
  else console.log('연금복권: 새 회차 없음');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error('실패:', e.message);
    // GitHub Actions 요약 화면에도 이유가 보이게
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=${process.argv[1].split('/').pop()}::${e.message.replace(/\n/g, ' / ')}`);
    process.exit(1);
  });
}
