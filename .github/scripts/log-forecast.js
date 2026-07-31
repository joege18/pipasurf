// PipaSurf daily forecast logger — same math as the live site (index.html).
// Appends today's own forecast to forecast-log.csv so it can be verified
// against observed conditions later. Run by .github/workflows/forecast-log.yml.
const fs = require("fs");
const LAT = -6.2278, LON = -35.0442, TZ = "America/Fortaleza";
const MODELS = ["ncep_gfswave025", "ecmwf_wam025", "gwam"];
const KG = (H, T) => 0.39 * Math.pow(9.81, 0.2) * Math.pow((T || 8) * H * H, 0.4);
const r1 = (x) => Math.round(x * 10) / 10;
(async () => {
  const base = `latitude=${LAT}&longitude=${LON}&timezone=${encodeURIComponent(TZ)}&forecast_days=1`;
  const mURL = `https://marine-api.open-meteo.com/v1/marine?${base}&daily=wave_height_max&models=${MODELS.join(",")}`;
  const sURL = `https://marine-api.open-meteo.com/v1/marine?${base}&daily=swell_wave_height_max,swell_wave_period_max`;
  const [mj, sj] = await Promise.all([fetch(mURL).then(r => r.json()), fetch(sURL).then(r => r.json())]);
  const date = mj.daily.time[0];
  const hs = MODELS.map(m => mj.daily["wave_height_max_" + m][0]).filter(v => v != null);
  if (!hs.length) { console.log("no model data — skipping"); return; }
  const mean = hs.reduce((a, b) => a + b, 0) / hs.length;
  const swH = sj.daily.swell_wave_height_max[0], swT = sj.daily.swell_wave_period_max[0];
  if (swH == null) { console.log("no swell data — skipping"); return; }
  const beach = KG(swH, swT);
  const lo = r1(beach * Math.min(...hs) / mean), hi = r1(beach * Math.max(...hs) / mean);
  const line = [date, lo, hi, r1(beach), r1(Math.min(...hs)), r1(mean), r1(Math.max(...hs)), swH, swT].join(",") + "\n";
  const f = "forecast-log.csv";
  let txt = fs.existsSync(f) ? fs.readFileSync(f, "utf8")
    : "date,beach_lo_m,beach_hi_m,beach_cons_m,offshore_min_m,offshore_mean_m,offshore_max_m,swell_h_m,swell_t_s\n";
  if (!txt.includes(date + ",")) { txt += line; fs.writeFileSync(f, txt); console.log("logged", line.trim()); }
  else console.log("already logged for", date);
})().catch(e => { console.error(e); process.exit(1); });
