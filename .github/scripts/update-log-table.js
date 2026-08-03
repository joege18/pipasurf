// Regenerates the homepage forecast-log table from forecast-log.csv (last 14 days).
// Runs right after log-forecast.js in .github/workflows/forecast-log.yml.
// It fully rebuilds the block between the FORECAST_LOG_START/END markers in
// index.html — keep those markers in place. forecast-log.csv stays the
// canonical log; the homepage table is a mirror so the log is readable by
// tools that can only fetch rendered pages (see HANDOVER.md).
const fs = require("fs");
const COLS = ["date", "beach_lo_m", "beach_hi_m", "offshore_min_m", "offshore_mean_m", "offshore_max_m"];
const lines = fs.readFileSync("forecast-log.csv", "utf8").trim().split(/\r?\n/);
const header = lines[0].split(",");
const idx = COLS.map((c) => header.indexOf(c));
const rows = lines.slice(1).filter(Boolean).slice(-14).reverse(); // newest first
const tr = (r) => {
  const f = r.split(",");
  return "          <tr>" + idx.map((i) => "<td>" + (f[i] ?? "") + "</td>").join("") + "</tr>";
};
const block = `<!-- FORECAST_LOG_START -->
<section id="forecast-log">
  <div class="card">
    <details class="tbl">
      <summary>Forecast log — last 14 days · Histórico de previsões</summary>
      <table class="tide-table">
        <thead><tr>${COLS.map((c) => "<th>" + c + "</th>").join("")}</tr></thead>
        <tbody>
${rows.map(tr).join("\n")}
        </tbody>
      </table>
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
console.log("updated forecast-log table (" + rows.length + " rows)");
