# Compatibility and limitations

How the assessment was made: every upstream repository was read (README,
`HOSTING.md` in the release archive, the release assets and the checksums),
the pinned release archive was downloaded and unpacked, and the result was
run in headless Chromium against a local server that behaves like GitHub
Pages.

## Matrix

| Application | Version | Release archive | WebAssembly                            | Isolation headers | Subdirectory             | Runtime                                | Status             |
| ----------- | ------- | --------------- | -------------------------------------- | ----------------- | ------------------------ | -------------------------------------- | ------------------ |
| PhotoCraft  | 0.11.1  | 11.0 MiB        | 10.9 MiB, gzipped and split into parts | not needed        | supported, relative URLs | WebGPU or WebGL2                       | deployed, verified |
| VectorCraft | 0.13.1  | 22.4 MiB        | 64.3 MiB, one file                     | not needed        | supported, relative URLs | WebGPU or WebGL2                       | deployed, verified |
| CADCraft    | 0.15.1  | 9.9 MiB         | 27.0 MiB, one file                     | not needed        | supported, relative URLs | WebGPU or WebGL2                       | deployed, verified |
| GridCraft   | 0.14.2  | 8.0 MiB         | 21.7 MiB, one file                     | not needed        | supported, relative URLs | WebGPU or WebGL2                       | deployed, verified |
| DeckCraft   | 0.13.1  | 11.0 MiB        | 30.6 MiB, one file                     | not needed        | supported, relative URLs | WebGPU or WebGL2                       | deployed, verified |
| PdfCraft    | 0.9.0   | 13.8 MiB        | 37.2 MiB, one file                     | not needed        | supported, relative URLs | WebGPU or WebGL2                       | deployed, verified |
| FilmCraft   | 0.9.0   | 12.7 MiB        | 39.3 MiB, one file                     | not needed        | supported, relative URLs | WebGPU or WebGL2, WebCodecs for video  | deployed, verified |
| SoundCraft  | 0.15.0  | 6.4 MiB         | 17.0 MiB, one file                     | not needed        | supported, relative URLs | WebGPU or WebGL2, WebAudio for playback | deployed, verified |
| WordCraft   | 0.13.2  | 17.7 MiB        | 48.2 MiB, one file                     | not needed        | supported, relative URLs | WebGPU or WebGL2                       | deployed, verified |

LightCraft, EffectCraft, DesignCraft and FigCraft are not part of this
deployment and are not covered by the table; the landing page lists them in
its "Not hosted here" catalog with a link to their repositories.

"No isolation headers needed" is upstream's own statement for every
application: none of them uses `SharedArrayBuffer`, WASM threads or any other
feature that requires cross-origin isolation. No `Cross-Origin-Opener-Policy`
or `Cross-Origin-Embedder-Policy` header is set, and no compatibility
service worker is used.

## GitHub Pages constraints and how they are met

| Constraint                 | Result                                                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static hosting only        | Every application is a static site. Files you open stay in the browser.                                                                                                    |
| No custom response headers | The applications do not need any. Upstream's `.htaccess` and `_headers` files only set cache and MIME rules and are dropped from the build.                                |
| WebAssembly content type   | GitHub Pages serves `.wasm` as `application/wasm`, which the streaming compiler needs. Verified on the live site.                                                          |
| Unknown paths must be 404  | GitHub Pages answers unknown paths with 404, which is what upstream asks for, so a missing file is visible instead of hidden behind the portfolio page.                    |
| File size limit            | The largest file is 64.3 MiB, below the 100 MiB limit of a published site.                                                                                                 |
| Site size limit            | The applications add about 299 MiB to the site.                                                                                                                            |
| Caching                    | GitHub Pages caches files with a stable name for a few minutes. A hard reload bypasses the cached copy.                                                                     |
| Subdirectory deployment    | All applications load their assets through relative URLs, so they work under `/photocraft/` and the other paths.                                                           |

## What the tests cover

The Playwright suite (`artcraft/tests`) checks, for every application:

- the entry point answers with 200,
- the application finishes starting up,
- the canvas is visible and has a size,
- no script errors are logged,
- no asset returns an error status,
- the landing page lists every application and every launch link works.

Every application also performs one real operation, and the test fails when
the measured area does not change:

| Application | Operation                                                       | Measured change          |
| ----------- | --------------------------------------------------------------- | ------------------------ |
| PhotoCraft  | drop a PNG on the canvas, the image opens                       | 96 % of the screen       |
| VectorCraft | drop an SVG on the canvas, the drawing opens                    | 61 % of the screen       |
| CADCraft    | the `LINE` command, then two points                             | 1.6 % of the screen      |
| GridCraft   | type `42` into cell A1                                          | 2.1 % of the A1 region   |
| DeckCraft   | click the second slide in the sidebar                           | 7.2 % of the screen      |
| PdfCraft    | drop a PDF on the canvas, the document opens                    | 29 % of the screen       |
| FilmCraft   | click a clip in the timeline, the inspector fills in            | 3 % of the inspector     |
| SoundCraft  | press Space, the transport starts                               | 0.46 % of the screen     |
| WordCraft   | click the "Blank document" tile, the document opens             | 90 % of the screen       |

The percentages are the values the last run of the suite reported against the
pinned builds at 1280x720 with SwiftShader. Where the operation changes a
small part of the window, the test measures that region instead and the
percentage refers to the region.

The click positions belong to the pinned versions and to the 1280x720
viewport of the test configuration. A version bump can move them, and the
test then says so.

FilmCraft is the one application whose file opening is not covered by an
automated test: its web build exposes no automation API and opens its file
dialog from the application's own menu, which a headless browser cannot
drive. The automated operation for FilmCraft is therefore a selection in
the timeline; opening a media file in FilmCraft has to be checked by hand.
CADCraft, GridCraft, DeckCraft, SoundCraft and WordCraft are driven through
their command line, cells, slide sidebar, transport and start screen instead
of opening a document.

## What the tests cannot cover

- **WebGPU.** Headless Chromium has no GPU adapter, so the tests exercise the
  WebGL2 and software rasterizer paths. The WebGPU path needs a browser with
  a working driver.
- **Audio and video.** FilmCraft's decode and playback need a real browser
  with audio output, and SoundCraft's WebAudio playback only starts after a
  user gesture, so the headless run proves the transport reacts but not that
  sound is audible.
- **The file picker.** The tests drop a file onto the canvas instead of
  using the operating system's file dialog.
- **Downloads and exports.** Saving a file goes through the browser's
  download flow, which a test cannot inspect.
- **Local storage.** GridCraft and WordCraft keep their preferences in the
  browser's storage, as their `HOSTING.md` states; a fresh browser profile
  starts with defaults.
- **Performance.** Software rendering is far slower than a GPU; the timings
  in the logs of the test run say nothing about real hardware.

## Known limitations of this deployment

- Only nine of the upstream applications are published here. LightCraft,
  EffectCraft, DesignCraft and FigCraft were left out of this deployment by
  choice; the landing page lists them with a link to their repositories
  instead of a build.
- The applications are community deployments of upstream projects. Upstream
  publishes the official binaries; this site only republishes the release
  builds of the tagged versions.
- GitHub Pages serves the site from its own CDN, so the first visit after an
  update can still be served from the cache for a few minutes.
- The site is served from the custom domain `jjw.is-a.dev`, which redirects
  from `thejjw.github.io`. Both addresses work.
