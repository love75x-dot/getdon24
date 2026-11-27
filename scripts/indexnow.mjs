// IndexNow: 새로 공개된 주소를 네이버·Bing 등 검색엔진에 바로 알린다 (구글은 지원하지 않아 사이트맵으로 간다)
//   node scripts/indexnow.mjs --since <git커밋>   그 커밋 이후 새로 공개된 글·회차 주소를 알림
//   node scripts/indexnow.mjs https://getdon24.com/blog/xxx/ ...   주소를 직접 알림
//   --dry  실제로 보내지 않고 목록만 출력
// 열쇠는 config.json indexNowKey, 확인 파일은 static/{열쇠}.txt (공개용 값이라 비밀이 아니다)
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(join(ROOT, 'config.json'), 'utf8'));
const site = config.siteUrl.replace(/\/$/, '');
const key = config.indexNowKey;
const args = process.argv.slice(2);
const dry = args.includes('--dry');
if (!key) { console.log('indexNowKey 가 없어 건너뜀'); process.exit(0); }

const at = (ref, path) => { try { return execFileSync('git', ['show', `${ref}:${path}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 }); } catch { return ''; } };
const now = async (path) => { try { return await readFile(join(ROOT, path), 'utf8'); } catch { return ''; } };
const rounds = (s) => { try { return new Set(JSON.parse(s).map((d) => d.round)); } catch { return new Set(); } };

let urls = [];
const si = args.indexOf('--since');
if (si >= 0) {
  const ref = args[si + 1];
  const slugs = (s) => new Set(s.split('\n').map((l) => l.split(' ')[1]).filter(Boolean));
  const before = slugs(at(ref, 'data/published.txt')), after = slugs(await now('data/published.txt'));
  const newPosts = [...after].filter((x) => !before.has(x));
  for (const s of newPosts) urls.push(`${site}/blog/${s}/`);
  if (newPosts.length) urls.push(`${site}/blog/`, `${site}/`);
  const lb = rounds(at(ref, 'data/lotto.json')), la = rounds(await now('data/lotto.json'));
  const newLotto = [...la].filter((r) => !lb.has(r));
  if (lb.size && newLotto.length) { for (const r of newLotto) urls.push(`${site}/lotto/${r}/`); urls.push(`${site}/lotto/`, `${site}/lotto/all/`); }
  const pb = rounds(at(ref, 'data/pension.json')), pa = rounds(await now('data/pension.json'));
  if (pb.size && [...pa].some((r) => !pb.has(r))) urls.push(`${site}/pension/`, `${site}/pension/all/`);
} else urls = args.filter((a) => a.startsWith('http'));

urls = [...new Set(urls)].filter((u) => u.startsWith(site + '/'));
if (!urls.length) { console.log('새로 알릴 주소 없음'); process.exit(0); }
console.log('알릴 주소:\n' + urls.join('\n'));
if (dry) process.exit(0);

// Cloudflare 가 새 페이지를 배포할 때까지 기다린다 (첫 주소가 열릴 때까지 최대 6분)
for (let i = 0; i < 24; i++) {
  try { const r = await fetch(urls[0], { method: 'HEAD' }); if (r.ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 15000));
}

const body = { host: new URL(site).host, key, keyLocation: `${site}/${key}.txt`, urlList: urls };
try {
  const r = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) });
  console.log(`IndexNow 응답 ${r.status} (200·202 이면 접수됨)`);
} catch (e) {
  console.log('IndexNow 전송 실패(사이트에는 영향 없음):', e.message);
}
