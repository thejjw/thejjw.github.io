# ArtCraft Creative Suite on GitHub Pages

This folder holds the deployment of seven upstream applications from the
[Storytold](https://github.com/storytold) organisation under this site's
GitHub Pages deployment.

| Application | Path            | Upstream                                                          |
| ----------- | --------------- | ----------------------------------------------------------------- |
| PhotoCraft  | `/photocraft/`  | [storytold/photocraft](https://github.com/storytold/photocraft)   |
| VectorCraft | `/vectorcraft/` | [storytold/vectorcraft](https://github.com/storytold/vectorcraft) |
| FilmCraft   | `/filmcraft/`   | [storytold/filmcraft](https://github.com/storytold/filmcraft)     |
| LightCraft  | `/lightcraft/`  | [storytold/lightcraft](https://github.com/storytold/lightcraft)   |
| PdfCraft    | `/pdfcraft/`    | [storytold/pdfcraft](https://github.com/storytold/pdfcraft)       |
| EffectCraft | `/effectcraft/` | [storytold/effectcraft](https://github.com/storytold/effectcraft) |
| DesignCraft | `/designcraft/` | [storytold/designcraft](https://github.com/storytold/designcraft) |

The landing page lives at `/crafting/`. The applications are the upstream
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

## Updating an application

1. Edit the entry of the application in `artcraft/manifest.json`: `tag`,
   `version`, `asset` and `sha256`.
2. Get the checksum of the new archive:

   ```sh
   curl -sL -o photocraft-web.zip \
     https://github.com/storytold/photocraft/releases/download/v0.12.0/photocraft-web-0.12.0.zip
   sha256sum photocraft-web.zip
   ```

   The same value is in the release's `SHA256SUMS.txt`.

3. Commit and push. The deploy workflow picks it up.

`npm run artcraft:fetch` refuses to install an archive whose checksum does
not match the manifest, and it also compares the manifest with the checksum
file that upstream publishes.

The `Check ArtCraft updates` workflow runs every Monday. It looks for newer
releases and opens an issue with the manifest entries ready to paste. It
never deploys on its own, and it never follows a moving branch: only tagged
releases are used.

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
| The browser serves an old version after an update | GitHub Pages caches files with a stable name for a few minutes. EffectCraft also caches itself in a service worker; open it with `?nosw`. |
| `validation failed` during the build              | A file that the page loads is missing from the build. The message names the application and the file.                                     |
| The deploy workflow fails while fetching          | The pinned release or its checksum no longer matches. Run `npm run artcraft:fetch` to see the mismatch.                                   |

Deployment logs live in the `Actions` tab of the repository. The deploy
workflow publishes to the `github-pages` environment, and the smoke tests
run as a separate workflow afterwards.
