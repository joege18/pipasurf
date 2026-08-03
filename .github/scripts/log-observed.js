// PipaSurf observed-conditions logger — companion to log-forecast.js.
// Each day, fetches Open-Meteo's archived ("analyzed") wave heights for the
// last few PAST days — the model's final view of what actually happened,
// after data assimilation — and appends any missing dates to observed-log.csv.
// This gives update-log-table.js an "observed" value to score each logged
// forecast against. Never fetches today (the day isn't complete yet).
// forecast-log.csv (predictions) is never touched.
const fs = require("fs");
const LAT = -6.2278, LON = -35.0442, TZ = "America/Fortaleza";
const MODELS = ["ncep_gfswave025", "ecmwf_wam025", "gwam"];
const r1 = (x) => Math.round(x * 10) / 10;
(async () => {
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${LAT}&longitude=${LON}` +
    `&timezone=${encodeURIComponent(TZ)}&past_days=5&forecast_days=1` +
    `&daily=wave_height_max&models=${MODELS.join(",")}`;
  const j = await (await fetch(url)).json();
  const today = j.daily.time[j.daily.time.length - 1];
  const f = "observed-log.csv";
  let txt = fs.existsSync(f) ? fs.readFileSync(f, "utf8")
    : "date,obs_min_m,obs_mean_m,obs_max_m\n";
  let added = 0;
  j.daily.time.forEach((date, i) => {
    if (date === today || txt.includes(date + ",")) return;
    const hs = MODELS.map((m) => j.daily["wave_height_max_" + m][i]).filter((v) => v != null);
    if (!hs.length) return;
    const mean = hs.reduce((a, b) => a + b, 0) / hs.length;
    txt += [date, r1(Math.min(...hs)), r1(mean), r1(Math.max(...hs))].join(",") + "\n";
    added++;
  });
  if (added) { fs.writeFileSync(f, txt); console.log("observed: added " + added + " day(s)"); }
  else console.log("observed: up to date");
})().catch(e => { console.error(e); process.exit(1); });
