# ArtCraft Creative Suite on GitHub Pages

This folder holds the deployment of nine upstream applications from the
[Storytold](https://github.com/storytold) organisation under this site's
GitHub Pages deployment.

| Application | Path            | Upstream                                                          |
| ----------- | --------------- | ----------------------------------------------------------------- |
| PhotoCraft  | `/photocraft/`  | [storytold/photocraft](https://github.com/storytold/photocraft)   |
| VectorCraft | `/vectorcraft/` | [storytold/vectorcraft](https://github.com/storytold/vectorcraft) |
| CADCraft    | `/cadcraft/`    | [storytold/cadcraft](https://github.com/storytold/cadcraft)       |
| GridCraft   | `/gridcraft/`   | [storytold/gridcraft](https://github.com/storytold/gridcraft)     |
| DeckCraft   | `/deckcraft/`   | [storytold/deckcraft](https://github.com/storytold/deckcraft)     |
| PdfCraft    | `/pdfcraft/`    | [storytold/pdfcraft](https://github.com/storytold/pdfcraft)       |
| FilmCraft   | `/filmcraft/`   | [storytold/filmcraft](https://github.com/storytold/filmcraft)     |
| SoundCraft  | `/soundcraft/`  | [storytold/soundcraft](https://github.com/storytold/soundcraft)   |
| WordCraft   | `/wordcraft/`   | [storytold/wordcraft](https://github.com/storytold/wordcraft)     |

LightCraft, EffectCraft, DesignCraft and FigCraft are not deployed. They are
listed in the manifest's `catalog` array instead, so the landing page can
point at their repositories without publishing their builds.

The landing page lives at `/crafting/`. It groups the applications by the
manifest's `categories` array ("Images, design and drafting", "Documents and
presentations", "Video, audio and motion") and repeats the projects that are
not deployed inside the matching group. The applications are the upstream
release builds, unmodified and redistributed under their own licenses
(Apache-2.0 and MIT). The icons on the landing page come from the same
pinned upstream tags.

## How it works

Nothing from the applications is stored in this repository. The deploy
workflow downloads the pinned release archives, checks their checksums,
unpacks them into the site and publishes the result.

```
artcraft/manifest.json     pinned upstream version and checksum per app
scripts/artcraft/fetch.mjs download, verify and unpack the release archives
scripts/artcraft/assemble.mjs  copy the apps into dist/ and write the landing page
scripts/artcraft/render-landing.mjs  the landing page generator
scripts/artcraft/validate.mjs  check that every referenced file is in the build
scripts/artcraft/serve.mjs   a static server that behaves like GitHub Pages
scripts/artcraft/check-updates.mjs  look for newer upstream releases
artcraft/tests/              Playwright smoke tests
```

## Local run

```sh
npm ci
npm run artcraft:fetch      # download and verify the pinned releases
npm run build               # build the portfolio into dist/
npm run artcraft:assemble   # add the applications and the landing page
npm run artcraft:validate   # fail on missing assets
npm run artcraft:serve      # serve dist/ on http://127.0.0.1:4173/
npm run artcraft:smoke      # Playwright tests against the local server
```

The smoke tests need a browser: `npx playwright install chromium`. Set
`ARTCRAFT_BASE_URL` to run them against a deployed site instead of the local
server.

The downloaded archives and their unpacked copies live in `.artcraft/`, which
is not tracked by git.

To rebuild a single application:

```sh
npm run artcraft:fetch -- --app photocraft
npm run artcraft:assemble
```

## Deploying

Push to `main`. The `Deploy` workflow builds the portfolio, fetches the
pinned applications, validates the result and publishes it with
`actions/upload-pages-artifact` and `actions/deploy-pages`. It can also be
started by hand (`workflow_dispatch`); the `dry_run` input builds and
validates without publishing.

After a successful deploy the `ArtCraft smoke tests` workflow runs the
Playwright tests against the live site.

## Refreshing the suite

The `Check ArtCraft updates` workflow runs every Monday and looks for newer
tagged releases. It never deploys on its own and never follows a moving
branch. When updates exist, the run lists them in its job summary and tries to
open an issue. Issues are disabled on this repository, so the run fails with a
warning that names the applications: a failed run means "updates available".

The same check runs locally (`node scripts/artcraft/check-updates.mjs`). A
refresh goes like this; do it on a branch, one commit per application, so a
single application can be rolled back with `git revert`.

1. **Pin the new release.** Run
   `node scripts/artcraft/check-updates.mjs --apply --app <id>`. It rewrites
   `tag`, `version`, `asset`, `sha256` and `releaseUrl` of that entry. Then
   `npm run artcraft:fetch -- --app <id>`, which refuses an archive whose
   checksum matches neither the manifest nor upstream's `SHA256SUMS.txt`.
2. **Read the release's `HOSTING.md`** (in `.artcraft/stage/<id>/`). GitHub
   Pages cannot set response headers, so an application that starts to need
   `SharedArrayBuffer`, WebAssembly threads or the COOP/COEP isolation
   headers cannot be hosted here. Check its `requires` and the stage line
   ("alpha", "pre-alpha", ...) of its README against the manifest `notes`.
3. **Re-measure, don't copy.** Update the application's row of the matrix in
   [COMPATIBILITY.md](COMPATIBILITY.md) with the archive size (from
   `.artcraft/cache/`) and the WebAssembly size (from the staged files), and
   any size quoted in the manifest `notes`.
4. **Commit** as `chore: bump <id> to <version>`, then repeat for the next
   application.
5. **Test the whole suite locally** before pushing:

   ```sh
   npm run build && npm run artcraft:assemble && npm run artcraft:validate
   npm run artcraft:serve     # in a second terminal
   npm run artcraft:smoke
   ```

   `artcraft:validate` fails when the site is over the size budget (950 MB,
   `ARTCRAFT_SIZE_BUDGET` to override; GitHub Pages stops at 1 GB) and prints
   the current size. The smoke tests print the measured change of each
   operation; copy changed values into the second table of COMPATIBILITY.md.
   An application can pass validation and still fail to start, so do not
   skip the smoke tests.
6. **Push and watch.** Push to `main` and follow the `Deploy` and
   `ArtCraft smoke tests` runs (`gh run watch <id> --exit-status`). Then open
   the live site, which is served from the custom domain in `CNAME`
   (`thejjw.github.io` redirects to it), and check `/crafting/` lists the new
   versions. The repository's Pages source is still the `main` branch, so a
   `pages-build-deployment` run of the repository root starts next to every
   `Deploy` run; the deployment that finishes last is live. `Deploy` has
   always finished last so far, but if the site ever shows the raw repository
   root, switch the Pages source to "GitHub Actions".

### When a release is broken

If an upstream release cannot run here, stay on the newest release that does
and add a `hold` to its manifest entry, naming the upstream issue:

```json
"hold": "storytold/photocraft#10017: the web builds of 0.17.0 and later cannot start"
```

The update check then reports the newer release as held: it does not count
as an update and `--apply` does not touch the entry. Remove the `hold` when
upstream ships a fixed release.

### The toolchain

The workflows pin a Node.js major (`node-version`) and the major version of
each GitHub action. Refresh them in the same pass: use the current Active LTS
from the [Node.js release schedule](https://github.com/nodejs/Release), read
the release notes of each action before raising its major, and update
`@playwright/test` with `npm install -D @playwright/test@latest` followed by
`npx playwright install chromium`.

## Rolling back

The deployment is reproducible, so a rollback is a revert. To go back to the
version before an application was updated:

```sh
git revert <the commit that bumped the version>
git push
```

To remove the whole suite, revert every commit it added, newest first. With
`c460746` as the first commit of the suite:

```sh
git revert --no-commit c460746^..HEAD
git commit -m "revert: remove the ArtCraft suite"
git push
```

The workflow rebuilds the site from the older pinned versions. GitHub Pages
keeps the previous deployment in its own history as well, so the site can be
switched back from the Pages tab of the repository settings.

## Troubleshooting

| Symptom                                           | Cause and fix                                                                                                                             |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| The application shows a blank canvas              | The browser has neither WebGPU nor WebGL2. PhotoCraft accepts `?webgl` and `?cpu` in its URL.                                             |
| A page loads but stays on "Loading …"             | The WebAssembly file did not arrive. Check the network tab for a 404 and run `npm run artcraft:validate` locally.                         |
| The browser serves an old version after an update | GitHub Pages caches files with a stable name for a few minutes. Hard-reload the tab to bypass the cached copy.                            |
| `validation failed` during the build              | A file that the page loads is missing from the build. The message names the application and the file.                                     |
| The deploy workflow fails while fetching          | The pinned release or its checksum no longer matches. Run `npm run artcraft:fetch` to see the mismatch.                                   |

Deployment logs live in the `Actions` tab of the repository. The deploy
workflow publishes to the `github-pages` environment, and the smoke tests
run as a separate workflow afterwards.
