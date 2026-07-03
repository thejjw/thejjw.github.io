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

Set or rotate the token with Wrangler's interactive prompt:

```powershell
npx wrangler secret put REFRESH_TOKEN
```

Store the value in a password manager if you want to reuse it. If the value is lost, rotate it to a new random value, call `/api/refresh` once, and either save the new value or let it remain write-only. `wrangler secret put` creates a new Worker version and deploys it immediately.

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
