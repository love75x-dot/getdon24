// 동행복권 공식 사이트에서 JSON 을 받아 오는 공통 함수
//
// 동행복권은 짧은 시간에 요청이 몰리면 IP 를 잠시 막는다. 그래서 요청마다 1초씩 쉬고,
// 막히거나 점검 중이면 HTML 이 돌아오는데, 그걸 데이터로 착각하지 않도록 JSON 이 아니면 바로 실패시킨다.

export const BASE = 'https://www.dhlottery.co.kr';
const DELAY_MS = 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function getJson(path, params = {}, { referer = '/', attempt = 1, fetchImpl = globalThis.fetch } = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}${path}${qs ? `?${qs}` : ''}`;
  if (fetchImpl === globalThis.fetch) await sleep(DELAY_MS);
  try {
    const res = await fetchImpl(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: BASE + referer,
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('JSON 이 아닌 응답이 왔어요 (동행복권 점검 중이거나 접속이 막혔을 수 있어요)');
    }
  } catch (e) {
    if (attempt >= 5) throw new Error(`${url} 실패: ${e.message}`);
    if (fetchImpl === globalThis.fetch) await sleep(2000 * 2 ** attempt);
    return getJson(path, params, { referer, attempt: attempt + 1, fetchImpl });
  }
}

export const ymd8 = (s) => {
  s = String(s ?? '');
  if (!/^\d{8}$/.test(s)) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
};
export const dayOfWeek = (date) => new Date(`${date}T12:00:00+09:00`).getUTCDay(); // 0=일 … 6=토
export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400e3);

// 바뀐 경우에만 파일을 쓴다 (불필요한 커밋 방지)
import { readFile, writeFile } from 'node:fs/promises';
export async function writeIfChanged(path, text) {
  const prev = await readFile(path, 'utf8').catch(() => null);
  if (prev === text) return false;
  await writeFile(path, text);
  return true;
}
export const jsonLines = (rows) => '[\n' + rows.map((r) => JSON.stringify(r)).join(',\n') + '\n]\n';
