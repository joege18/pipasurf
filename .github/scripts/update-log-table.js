// Regenerates the homepage forecast-log table from forecast-log.csv (last 14
// days), joined with observed-log.csv (written by log-observed.js) to score
// each day's forecast. Runs after log-forecast.js and log-observed.js in
// .github/workflows/forecast-log.yml.
// It fully rebuilds the block between the FORECAST_LOG_START/END markers in
// index.html — keep those markers in place. forecast-log.csv stays the
// canonical log; the homepage table is a mirror so the log is readable by
// tools that can only fetch rendered pages (see HANDOVER.md).
// Accuracy = how close offshore_mean_m came to the model's final analyzed
// mean for that day (100% = exact): max(0, 100 - |fc-obs|/obs*100).
const fs = require("fs");
const COLS = ["date", "beach_lo_m", "beach_hi_m", "offshore_min_m", "offshore_mean_m", "offshore_max_m"];
const r1 = (x) => Math.round(x * 10) / 10;

const lines = fs.readFileSync("forecast-log.csv", "utf8").trim().split(/\r?\n/);
const header = lines[0].split(",");
const idx = COLS.map((c) => header.indexOf(c));
const fcMeanIdx = header.indexOf("offshore_mean_m");
const rows = lines.slice(1).filter(Boolean).slice(-14).reverse(); // newest first

// date -> analyzed mean wave height (observed-log.csv from log-observed.js)
const obs = {};
if (fs.existsSync("observed-log.csv")) {
  const ol = fs.readFileSync("observed-log.csv", "utf8").trim().split(/\r?\n/);
  const oh = ol[0].split(",");
  const di = oh.indexOf("date"), mi = oh.indexOf("obs_mean_m");
  ol.slice(1).filter(Boolean).forEach((r) => {
    const f = r.split(",");
    if (f[di] && f[mi]) obs[f[di]] = parseFloat(f[mi]);
  });
}

const accs = [];
const tr = (r) => {
  const f = r.split(",");
  const o = obs[f[0]];
  let obsCell = "—", accCell = "—";
  if (o != null && !isNaN(o)) {
    obsCell = String(r1(o));
    const fc = parseFloat(f[fcMeanIdx]);
    const acc = Math.max(0, Math.round(100 - (Math.abs(fc - o) / o) * 100));
    accs.push(acc);
    accCell = acc + "%";
  }
  const cells = idx.map((i) => "<td>" + (f[i] ?? "") + "</td>").join("");
  return "          <tr>" + cells + "<td>" + obsCell + "</td><td>" + accCell + "</td></tr>";
};
const body = rows.map(tr).join("\n");
const avg = accs.length ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : null;
const avgLine = avg != null
  ? `Average accuracy: <b>${avg}%</b> over ${accs.length} scored day${accs.length === 1 ? "" : "s"}. `
  : "";

const block = `<!-- FORECAST_LOG_START -->
<section id="forecast-log">
  <div class="card">
    <details class="tbl">
      <summary>Forecast log — last 14 days · Histórico de previsões</summary>
      <table class="tide-table">
        <thead><tr>${COLS.map((c) => "<th>" + c + "</th>").join("")}<th>observed_m</th><th>accuracy</th></tr></thead>
        <tbody>
${body}
        </tbody>
      </table>
      <p style="margin-top:10px;font-size:11.5px;color:var(--muted)">${avgLine}observed_m = the wave model's final analyzed mean offshore height for that day (Open-Meteo, after real measurements are assimilated). accuracy compares the offshore_mean_m we forecast that morning against observed_m: 100% minus the error as a share of observed — e.g. forecast 1.9 m vs observed 1.8 m is 0.1 m off, so 94%. 100% = match to within 0.1 m rounding. Only the offshore mean is scored, not the min–max range or beach estimate. — = not yet analyzed.</p>
    </details>
  </div>
</section>
<!-- FORECAST_LOG_END -->`;

const html = fs.readFileSync("index.html", "utf8");
const re = /<!-- FORECAST_LOG_START -->[\s\S]*?<!-- FORECAST_LOG_END -->/;
if (!re.test(html)) {
  console.error("FORECAST_LOG markers not found in index.html — skipping table update");
  process.exit(0); // don't block the CSV logging commit
}
fs.writeFileSync("index.html", html.replace(re, block));
console.log("updated forecast-log table (" + rows.length + " rows, " + accs.length + " scored, avg " + (avg ?? "n/a") + "%)");
