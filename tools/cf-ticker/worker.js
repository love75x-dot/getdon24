// 받는돈 알람 시계 (Cloudflare Worker, 예약 실행)
// GitHub 예약 실행이 몇 시간씩 밀려서, 정해진 시각에 GitHub 의 update.yml 작업을 직접 깨운다.
// 필요한 것: Worker 비밀 값 GH_TOKEN (이 저장소의 Actions 읽기·쓰기 권한만 있는 GitHub 세분화 토큰)
// 예약 시각(UTC, Cloudflare Worker 설정 → 트리거 → Cron)
//   5 22 * * *              매일 07:05 KST  예약 글 공개
//   */20 12-13 * * SAT      토 21:00~22:40 KST 20분마다  로또 당첨번호
//   17 0 * * SUN            일 09:17 KST  로또 1등 판매점
//   15,45 10 * * THU        목 19:15·19:45 KST  연금복권
//   (GitHub 쪽 예약 실행도 그대로 두어 예비로 쓴다)
const REPO = 'love75x-dot/getdon24';
const WORKFLOW = 'update.yml';

async function wake(env) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'getdon24-ticker',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: 'main' }),
  });
  return r.status; // 204 이면 성공
}

export default {
  async scheduled(event, env, ctx) {
    const s = await wake(env);
    console.log(`update.yml 깨우기 ${event.cron} → ${s}`);
    if (s !== 204) throw new Error('GitHub 응답 ' + s + ' (토큰 권한·만료 확인)');
  },
  // 주소로 열면 상태만 보여 준다 (작업을 실행하지 않음)
  async fetch(req, env) {
    return new Response(`getdon24 ticker: ${env.GH_TOKEN ? '토큰 있음' : '토큰 없음(GH_TOKEN 비밀 값 필요)'}`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  },
};
