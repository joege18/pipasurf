// Shared fetch helper for the PipaSurf loggers (log-forecast.js, log-observed.js).
//
// Why this exists: on 2026-10-12 the daily log failed with
// "TypeError: fetch failed … ETIMEDOUT" less than a second after starting.
// Node tries IPv6 and IPv4 in turn and by default gives each attempt only
// 250 ms to connect, so one slow moment between the GitHub runner and
// Open-Meteo killed the whole run — with no second try.
//
// So: give each connection attempt a realistic amount of time, and retry
// a few times with a growing pause before giving up.
const net = require("net");
if (net.setDefaultAutoSelectFamilyAttemptTimeout) net.setDefaultAutoSelectFamilyAttemptTimeout(5000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const WAITS = [5, 15, 30, 60]; // seconds between attempts → 5 attempts in total

async function fetchJSON(url, label = "request") {
  let lastErr;
  for (let attempt = 0; attempt <= WAITS.length; attempt++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
      // 4xx (other than rate limiting) means the request itself is wrong — retrying won't help
      if (r.status >= 400 && r.status < 500 && r.status !== 429) {
        const e = new Error(`${label}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
        e.fatal = true;
        throw e;
      }
      if (!r.ok) throw new Error(`${label}: HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      lastErr = e;
      if (e.fatal || attempt === WAITS.length) break;
      const why = (e.cause && (e.cause.code || e.cause.message)) || e.message;
      console.log(`${label}: attempt ${attempt + 1} failed (${why}) — retrying in ${WAITS[attempt]}s`);
      await sleep(WAITS[attempt] * 1000);
    }
  }
  throw lastErr;
}

module.exports = { fetchJSON };
