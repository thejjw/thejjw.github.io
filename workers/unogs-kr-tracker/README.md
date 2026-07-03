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
