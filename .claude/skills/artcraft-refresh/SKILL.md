---
name: artcraft-refresh
description: Refresh the ArtCraft suite on this site - bump the pinned Storytold applications in artcraft/manifest.json to their latest releases, refresh the workflow toolchain (Node.js, GitHub actions, Playwright), verify, push and check the live deploy. Use when asked to update, bump or refresh ArtCraft, the crafting apps, or their tooling, or when the weekly "Check ArtCraft updates" run failed.
---

# ArtCraft refresh

The procedure lives in `artcraft/README.md`, section "Refreshing the suite".
Read it first and follow it; this skill only adds what an agent needs on top.

## Before starting

- Run `node scripts/artcraft/check-updates.mjs` to see what is new. Make sure
  `GITHUB_TOKEN` and `GITHUB_REPOSITORY` are unset locally, or the script
  tries to open an issue.
- Work on a `chore/` branch. Ask before pushing unless the user already said
  to push in this task.
- Plan the size budget: `artcraft:validate` prints the site size against the
  950 MB budget. If the bumps would cross it, stop and ask.

## Gotchas learned the hard way

- `artcraft:validate` passing does not mean the apps start. PhotoCraft
  0.17.0+ passed an older validate and hung on "Loading PhotoCraft...". Always
  run `artcraft:smoke` locally against `artcraft:serve` before pushing.
- When a release is broken, pin the newest working release and add a `hold`
  (see the README) instead of leaving the app on a broken build. Tell the user,
  and check whether the upstream issue named in an existing `hold` is fixed.
- Re-measure every figure in `artcraft/COMPATIBILITY.md` and the manifest
  `notes`. The project replaced guessed figures with measured ones on purpose.
  The smoke test prints `<id>: measured change N %` for the second table.
- `COMPATIBILITY.md` and `README.md` are not Prettier-clean; don't reformat
  them as part of a refresh.
- Node.js: check the current Active LTS at
  https://raw.githubusercontent.com/nodejs/Release/main/schedule.json rather
  than assuming. Check action majors with
  `gh api repos/actions/<name>/releases/latest --jq .tag_name` and read the
  release notes; `upload-pages-artifact` skips hidden files since v4.

## After pushing

- `gh run list --commit <sha>` gives the `Deploy` run; follow it with
  `gh run watch <id> --exit-status` in the background, then the
  `ArtCraft smoke tests` run that follows it.
- The live site is the domain in `CNAME` (`jjw.is-a.dev`), not
  `thejjw.github.io`, which only redirects. Check `/crafting/` lists the new
  versions and that a big `.wasm` is served as `application/wasm`.
- Pages' source is still the `main` branch, so `pages-build-deployment` races
  `Deploy`. Compare their `updatedAt`: `Deploy` must finish last. If the live
  site is the raw repository root, tell the user to switch the Pages source to
  "GitHub Actions" (a settings change; don't make it yourself).
- If a deployed app is broken, revert its bump commit; if the build failed,
  the live site is untouched, so fix forward.
