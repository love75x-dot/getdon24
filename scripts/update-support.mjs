// 정부 지원사업 공고를 기업마당(bizinfo.go.kr) 정책정보 API 에서 받아 data/support/gov.json 에 반영한다.
//
//   BIZINFO_API_KEY=... node scripts/update-support.mjs
//
// - API 키는 환경변수로만 받는다 (GitHub Secrets → BIZINFO_API_KEY). 키가 없으면 아무것도 하지 않고 끝낸다.
// - 같은 공고(공고 ID)는 한 번만 저장하고, 다시 오면 내용만 갱신한다. 처음 수집일(firstSeen)은 유지.
// - 마감 후 90일이 지난 공고는 목록에서 뺀다 (화면이 끝없이 길어지지 않게).
// - 금액은 API 에 별도 항목이 없어 비워 둔다. 추측해서 채우지 않는다.
//
// 주의: 응답 항목 이름은 공개 자료 기준이고, 키를 받은 뒤 실제 응답으로 한 번 확인해야 한다.
//       알 수 없는 형식이 오면 저장하지 않고 실패로 끝난다.

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeIfChanged } from './lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'data/support/gov.json');
const API = 'https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do';
const TODAY = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const KEEP_DAYS_AFTER_END = 90;

const ymd = (s) => {
  const m = String(s || '').match(/(\d{4})[.\-/]?(\d{2})[.\-/]?(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
};
// "20261101 ~ 20261130" 같은 접수기간에서 시작·마감일
export function period(s) {
  const all = [...String(s || '').matchAll(/(\d{4})[.\-/]?(\d{2})[.\-/]?(\d{2})/g)].map((m) => `${m[1]}-${m[2]}-${m[3]}`);
  return { start: all[0] || '', end: all[1] || all[0] || '' };
}
// 대상 문구로 화면 필터(소상공인/직장인/청년/육아) 붙이기
export function targetTags(text) {
  const t = String(text || '');
  const tags = [];
  if (/소상공인|자영업|예비창업|창업|중소기업|사업자/.test(t)) tags.push('소상공인');
  if (/청년|대학생|만\s?(1[5-9]|2\d|3[0-9])세/.test(t)) tags.push('청년');
  if (/출산|육아|임신|아동|자녀|보육/.test(t)) tags.push('육아');
  if (/근로자|직장인|재직자/.test(t)) tags.push('직장인');
  return tags;
}
export function toItem(r) {
  const id = String(r.pblancId || '').trim();
  const name = String(r.pblancNm || '').trim();
  let url = String(r.pblancUrl || '').trim();
  if (url && url.startsWith('/')) url = 'https://www.bizinfo.go.kr' + url;
  if (!id || !name || !/^https?:\/\//.test(url)) return null;
  const { start, end } = period(r.reqstBeginEndDe);
  const target = String(r.trgetNm || '').trim();
  return {
    id: 'biz-' + id.replace(/[^A-Za-z0-9_-]/g, ''),
    name,
    host: String(r.jrsdInsttNm || r.excInsttNm || '').trim(),
    target,
    tags: targetTags(`${target} ${r.hashtags || ''} ${name}`),
    amount: '',
    start, end,
    url,
    source: '기업마당',
    checkedAt: TODAY,
  };
}

async function fetchAll(key) {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const qs = new URLSearchParams({ crtfcKey: key, dataType: 'json', searchCnt: '100', pageUnit: '100', pageIndex: String(page) });
    const res = await fetch(`${API}?${qs}`, { headers: { 'User-Agent': 'getdon24-support-bot' }, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`기업마당 HTTP ${res.status}`);
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { throw new Error('기업마당 응답이 JSON 이 아니에요 (키 오류·점검 중일 수 있어요)'); }
    const rows = json.jsonArray || json.items || json.item || (Array.isArray(json) ? json : null);
    if (!Array.isArray(rows)) throw new Error('기업마당 응답에서 공고 목록을 찾지 못했어요. 응답 형식 확인 필요: ' + Object.keys(json).join(','));
    out.push(...rows);
    if (rows.length < 100) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return out;
}

async function main() {
  const key = process.env.BIZINFO_API_KEY;
  if (!key) { console.log('BIZINFO_API_KEY 가 없어서 정부 지원사업 수집을 건너뛰어요.'); return; }
  const rows = await fetchAll(key);
  const items = rows.map(toItem).filter(Boolean);
  if (rows.length && !items.length) throw new Error('공고는 받았지만 공고 ID·이름·링크를 하나도 읽지 못했어요. 항목 이름이 바뀌었는지 확인 필요');

  const prev = JSON.parse(await readFile(FILE, 'utf8'));
  const byId = new Map(prev.map((x) => [x.id, x]));
  let added = 0;
  for (const it of items) {
    const old = byId.get(it.id);
    if (!old) added++;
    byId.set(it.id, { ...it, firstSeen: old?.firstSeen || TODAY });
  }
  const cutoff = new Date(Date.now() + 9 * 3600e3 - KEEP_DAYS_AFTER_END * 86400e3).toISOString().slice(0, 10);
  const next = [...byId.values()].filter((x) => !x.end || x.end >= cutoff).sort((a, b) => (a.end || '9999').localeCompare(b.end || '9999') || a.id.localeCompare(b.id));
  if (await writeIfChanged(FILE, JSON.stringify(next, null, 1) + '\n')) console.log(`gov.json 저장: 받은 공고 ${items.length}건, 새 공고 ${added}건, 전체 ${next.length}건`);
  else console.log('정부 지원사업: 바뀐 내용 없음');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error('실패:', e.message);
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=update-support::${e.message}`);
    process.exit(1);
  });
}
