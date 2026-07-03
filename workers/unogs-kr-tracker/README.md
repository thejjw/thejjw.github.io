# Netflix KR uNoGS Tracker Worker

Cloudflare Worker that scrapes uNoGS South Korea (`countrylist=348`) for Netflix titles that are leaving soon and newly added in the last 30 days. Cron stores the latest snapshots in Workers KV, and the HTTP API serves them to the GitHub Pages dashboards with restricted CORS.

## Setup

```powershell
Set-Location .\thejjw.github.io\workers\unogs-kr-tracker
npm install
```

The checked-in `wrangler.jsonc` is already bound to the `SNAPSHOTS` KV namespace for this account.
If you recreate the namespace, run `npx wrangler kv namespace create SNAPSHOTS` and replace the `id` in `wrangler.jsonc`.

## Manual Refresh Token

`/api/refresh` is protected by the `REFRESH_TOKEN` Worker secret when it is configured. This is a per-Worker secret for `unogs-kr-tracker`, not an account-wide secret. Wrangler and the Cloudflare dashboard can show that the secret exists, but they do not reveal its value after it is set.

Set or rotate the token with Wrangler's interactive prompt (type the value when asked):

```powershell
npx wrangler secret put REFRESH_TOKEN
```

Store the value in a password manager if you want to reuse it. If the value is lost, rotate it to a new random value, call `/api/refresh` once, and either save the new value or let it remain write-only. `wrangler secret put` creates a new Worker version and deploys it immediately.

> **Windows PowerShell gotcha (cost real debugging time).** Do **not** pipe the value into
> `wrangler secret put` non-interactively, e.g. `"value" | npx wrangler secret put REFRESH_TOKEN`.
> On Windows PowerShell the piped stdin is not delivered reliably through the `npx`/`cmd`
> wrapper: Wrangler prints `Success! Uploaded secret` but the stored value is **unchanged**,
> so every `/api/refresh` call then returns `401 unauthorized` no matter what token you send.
> Feeding exact bytes via a redirected `System.Diagnostics.Process` stdin failed the same way.
> For scripted / non-interactive setting, use `wrangler secret bulk` with a JSON file instead:
>
> ```powershell
> # write {"REFRESH_TOKEN":"<value>"} as UTF-8 without BOM, then:
> npx wrangler secret bulk .\secrets.json   # reliably stores the exact value
> npx wrangler deploy                        # make the new version active
> Remove-Item .\secrets.json                 # do not commit the file
> ```
>
> To confirm what is actually stored without leaking it, temporarily add a route that returns
> `{ len, sha256 }` of `env.REFRESH_TOKEN` and compare against a locally computed hash; remove
> the route and redeploy afterward.

List configured secret names:

```powershell
npx wrangler secret list
```

Call production refresh with the token:

```powershell
Invoke-RestMethod "https://unogs-kr-tracker.thejjw.workers.dev/api/refresh" -Headers @{ Authorization = "Bearer <token>" }
```

If `REFRESH_TOKEN` is not configured, `/api/refresh` remains publicly callable and returns a warning in its JSON response.

## Local Development

```powershell
Set-Location .\thejjw.github.io\workers\unogs-kr-tracker
npx wrangler dev --test-scheduled
```

Test snapshot reads:

```powershell
Invoke-RestMethod "http://localhost:8787/api/expiring.json"
Invoke-RestMethod "http://localhost:8787/api/new.json"
```

Run a manual scrape:

```powershell
Invoke-RestMethod "http://localhost:8787/api/refresh"
```

When `REFRESH_TOKEN` is configured:

```powershell
Invoke-RestMethod "http://localhost:8787/api/refresh" -Headers @{ Authorization = "Bearer <token>" }
```

Trigger the scheduled handler locally:

```powershell
Invoke-RestMethod "http://localhost:8787/cdn-cgi/handler/scheduled"
```

## Deploy

```powershell
Set-Location .\thejjw.github.io\workers\unogs-kr-tracker
npx wrangler deploy --dry-run
npx wrangler deploy
```

Public endpoint: `https://unogs-kr-tracker.thejjw.workers.dev`

The configured cron is `30 20 * * *`, which runs daily at 20:30 UTC.

## API

- `GET /api/expiring.json` returns the latest `expiring:latest` KV snapshot.
- `GET /api/new.json` returns the latest `new:latest` KV snapshot.
- `GET` or `POST /api/refresh` scrapes uNoGS immediately and updates both KV snapshots.

CORS is emitted only for these origins:

- `https://jjw.is-a.dev`
- `https://thejjw.github.io`

## uNoGS data fields (what one search call gives us)

The Worker makes **one** `GET https://unogs.com/api/search` call per mode (after minting a
short-lived JWT via `POST /api/user`). Verified raw fields on each result object:

```
id, title, slug, img, vtype, nfid, synopsis, avgrating,
year, runtime, imdbid, poster, top250, top250tv, clist,
titledate, cbdate            (+ expires on the "expiring" query)
```

`normalizeResult()` projects the useful ones into the snapshot. Notable field notes:

- `avgrating` -> `rating`: a ~0-5 average (NOT IMDb's 0-10 scale; e.g. Watchmen ~3.6). The
  dashboard shows it as a `★ x.x` chip, hidden when `0`.
- `top250` / `top250tv` -> IMDb Top-250 movie / TV rank; shown as an `IMDb Top 250 #N` chip
  when non-null. Usually empty on the "new last 30 days" list.
- `clist` (country availability) is `null` in a country-filtered search; `id` / `titledate`
  are not useful (redundant with `cbdate` / `expires`). Not surfaced.
- `genres` is emitted as `[]`: the search response has **no** genre field.

### Fields that are NOT in the search response (do not chase them for free)

The original PowerShell tracker showed genres, maturity rating (`matlabel`), IMDb content
rating (`imdbrated`), country of origin (`imdbcountry`), and language (`imdblanguage`). Those
are **not** in `/api/search` — they came from **two extra per-title calls**,
`GET /api/title/genres?netflixid=` and `GET /api/title/detail?netflixid=`, i.e. `2 x N`
subrequests for an N-title list. The Cloudflare **free plan caps a Worker invocation at 50
subrequests**, so that fan-out is not viable here (the "new" list alone is up to 100 titles).
Treat these fields as off-limits unless the plan changes or the calls are batched.

## The "expiring" query and country codes

`query=expiring` returns titles that are **imminently** leaving (roughly the next week), not
every title flagged as expiring. It is a normal `/api/search` call, so each result has the
same schema as above **plus** a populated `expires` date (e.g. `2026-07-08`) and a populated
`clist` (country availability). `rating` / `top250` / `top250tv` apply here too — the Worker's
`normalizeResult()` adds them in both modes.

South Korea (`countrylist=348`) frequently has **0** imminent-expiring titles even though the
per-country `expiring` counter (see below) is ~30; that counter is a broader total, not the
imminent list. To see non-empty expiring data for testing, use a busier country such as
Australia (`23`), Japan (`267`), or the UK (`46`).

### Country reference endpoint

`GET https://unogs.com/api/static/all` (Bearer auth, cached, cheap) returns
`{ adinfo, countries, clist, languages }`. `countries.results[]` maps each country to its
numeric `id` — the value the `countrylist` search param expects — along with a live
`expiring` count, `nl7` (new in last 7 days), and catalog totals (`tmovs`, `tseries`, `tvids`).

Numeric `countrylist` codes (from `api/static/all`, verified 2026-07-03):

| Code | Country | Code | Country | Code | Country |
|---|---|---|---|---|---|
| 21 | Argentina | 269 | Italy | 392 | Poland |
| 23 | Australia | 267 | Japan | 268 | Portugal |
| 26 | Belgium | 357 | Lithuania | 400 | Romania |
| 29 | Brazil | 378 | Malaysia | 408 | Singapore |
| 33 | Canada | 65 | Mexico | 412 | Slovakia |
| 36 | Colombia | 67 | Netherlands | 447 | South Africa |
| 307 | Czech Republic | 390 | Philippines | **348** | **South Korea** |
| 45 | France | 270 | Spain | 73 | Sweden |
| 39 | Germany | 34 | Switzerland | 425 | Thailand |
| 327 | Greece | 432 | Turkey | 436 | Ukraine |
| 331 | Hong Kong | 46 | United Kingdom | 78 | United States |
| 334 | Hungary | 265 | Iceland | 337 | India |
| 336 | Israel | | | | |

Note: the unogs.com **site UI** uses ISO-2 codes (`kr`, `au`) in its dropdown, but the
**API** uses these numeric ids.

> **Throttling gotcha.** uNoGS rate-limits rapid `POST /api/user` token minting: after a burst,
> freshly minted tokens return **empty** `results` (count 0) for every search, which looks
> exactly like "no data." When probing manually, mint one token and reuse it, space out calls,
> and cross-check against the live site before concluding a query is broken.
