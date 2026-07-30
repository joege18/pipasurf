# PipaSurf.com — Developer Handover

Live site: **https://pipasurf.com** · Repo: `joege18/pipasurf` · Hosting: **GitHub Pages** (free)

## Architecture (intentionally simple)

The entire site is **one static file: `index.html`** — no build step, no framework, no server, no dependencies. All CSS/JS is inline. Data is fetched **client-side** by each visitor's browser directly from the Open-Meteo APIs (free, no key, CORS-enabled), so there is nothing to run or pay for on the backend.

**Deploying = committing to `main`.** GitHub Pages (Settings → Pages: deploy from branch `main`, root) rebuilds automatically in ~1 minute. That's the whole pipeline.

## Data flow (all in `index.html`'s `<script>`)

- `liveData()` makes 3 fetches for Praia da Pipa (lat `-6.2278`, lon `-35.0442`, tz `America/Fortaleza`):
  1. **Waves, multi-model** — Open-Meteo Marine API with `models=ncep_gfswave025,ecmwf_wam025,gwam` (NOAA, ECMWF, DWD; Météo-France was removed at the owner's request). Per-model daily max height / period / direction. The **consensus** shown is the per-day mean across models; day-card ranges are the min–max model spread. Model horizons differ, so trailing `null`s are filled forward per model (`fill()`).
  2. **Tides** — Marine API `hourly=sea_level_height_msl`. **Station calibration**: `TIDE_DT = +26 min`, `TIDE_DATUM = +1.21 m` (the global tide model runs ~26 min early at Pipa and reports vs MSL, not local chart datum; these constants were fitted against the Abacateiro station / Surfline tide tables — do not remove them). Extremes (H/L) are found by local-extremum detection with parabolic refinement (`extremes()`).
  3. **Wind** — Open-Meteo forecast API, daily max speed (knots) and dominant direction.
- `demoData()` is a seeded synthetic fallback used only if the fetches fail (offline/sandboxed contexts).
- Auto-refresh: `setInterval(load, 3600000)` — hourly while a tab is open; every page load is fresh anyway.

## UI state

`lang` (`'en'` default; `?lang=pt` URL param or the PT/EN toggle), `daySel` (selected day, click day cards **or** chart bars), `srcSel` (`null` = consensus, else index into `MODELS`). All rendering re-runs from these three via `renderAll()`/`renderWave()`/`renderDays()`/`renderSources()`. All user-facing strings live in the `I18N` object (en + pt) — edit copy there, not in the markup.

## Important constraint — do not scrape the surf brands

The "Compare on:" chips (Surfline, Windguru, Surf-Forecast, Windfinder, Windy.app) are **links only, on purpose**. Their forecast data is proprietary and their ToS prohibit automated extraction/republication — do not fetch their numbers into the site. If licensed third-party data is ever wanted, use a commercial API (e.g. Stormglass).

## Domain / DNS (GoDaddy)

- `pipasurf.com`: 4 × A records `@` → `185.199.108.153 / .109.153 / .110.153 / .111.153` (GitHub Pages)
- `www` CNAME → `joege18.github.io`
- Custom domain set in repo Settings → Pages, **Enforce HTTPS** on, `CNAME` file in repo root (don't delete it).

## Other files

`favicon.svg`, `apple-touch-icon.png`, `og-image.png` (social preview), `robots.txt` + `sitemap.xml` (SEO; sitemap lists `/` and `/?lang=pt` with hreflang), `README.md`.

## Scheduled monitoring

A daily Claude scheduled task ("PipaSurf daily 2am ET check", 06:06 UTC) verifies the site is up and emails/pushes the owner a comparison of the five surf sites' Pipa forecasts. It is read-only — it never modifies the repo.
