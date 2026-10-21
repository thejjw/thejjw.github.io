# Compatibility and limitations

How the assessment was made: every upstream repository was read (README,
`HOSTING.md` in the release archive, the release assets and the checksums),
the pinned release archive was downloaded and unpacked, and the result was
run in headless Chromium against a local server that behaves like GitHub
Pages.

## Matrix

| Application | Version | Release archive | WebAssembly                            | Isolation headers | Subdirectory             | Runtime                                | Status             |
| ----------- | ------- | --------------- | -------------------------------------- | ----------------- | ------------------------ | -------------------------------------- | ------------------ |
| PhotoCraft  | 0.11.1  | 11.0 MiB        | 11.4 MiB, gzipped and split into parts | not needed        | supported, relative URLs | WebGPU or WebGL2                       | deployed, verified |
| VectorCraft | 0.13.1  | 22.4 MiB        | 67.4 MiB, one file                     | not needed        | supported, relative URLs | WebGPU or WebGL2                       | deployed, verified |
| FilmCraft   | 0.9.0   | 12.7 MiB        | 41.2 MiB, one file                     | not needed        | supported, relative URLs | WebGPU or WebGL2, WebCodecs for video  | deployed, verified |
| LightCraft  | 0.9.1   | 21.3 MiB        | 25.8 MiB, one file                     | not needed        | supported, relative URLs | WebGPU or WebGL2, OPFS for the library | deployed, verified |
| PdfCraft    | 0.9.0   | 13.8 MiB        | 39.0 MiB, one file                     | not needed        | supported, relative URLs | WebGPU or WebGL2                       | deployed, verified |
| EffectCraft | 0.11.1  | 18.4 MiB        | 63.3 MiB, one file                     | not needed        | supported, relative URLs | WebGPU or WebGL2                       | deployed, verified |
| DesignCraft | 0.10.0  | 18.4 MiB        | 49.3 MiB, one file                     | not needed        | supported, relative URLs | WebGPU or WebGL2                       | deployed, verified |

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
| File size limit            | The largest file is 67.4 MiB, below the 100 MiB limit of a published site.                                                                                                 |
| Site size limit            | The applications add about 290 MiB to the site.                                                                                                                            |
| Caching                    | GitHub Pages caches files with a stable name for a few minutes. EffectCraft's own service worker can keep an older copy; its landing page link opens the app with `?nosw`. |
| Subdirectory deployment    | All applications load their assets through relative URLs, so they work under `/photocraft/` and the other paths.                                                           |

## What the tests cover

The Playwright suite (`artcraft/tests`) checks, for every application:

- the entry point answers with 200,
- the application finishes starting up,
- the canvas is visible and has a size,
- no script errors are logged,
- no asset returns an error status,
- the landing page lists every application and every launch link works.

## What the tests cannot cover

- **WebGPU.** Headless Chromium has no GPU adapter, so the tests exercise the
  WebGL2 and software rasterizer paths. The WebGPU path needs a browser with
  a working driver.
- **Audio and video.** FilmCraft's decode and playback, and EffectCraft's
  audio worklet, need a real browser with audio output.
- **The file picker.** The tests drop a file onto the canvas instead of
  using the operating system's file dialog.
- **Downloads and exports.** Saving a file goes through the browser's
  download flow, which a test cannot inspect.
- **Local storage.** LightCraft keeps its library in the browser's storage
  and asks for persistent storage; a fresh browser profile has none.
- **Performance.** Software rendering is far slower than a GPU; the timings
  in the logs of the test run say nothing about real hardware.

## Known limitations of this deployment

- The applications are community deployments of upstream projects. Upstream
  publishes the official binaries; this site only republishes the release
  builds of the tagged versions.
- GitHub Pages serves the site from its own CDN, so the first visit after an
  update can still be served from the cache for a few minutes.
- The site is served from the custom domain `jjw.is-a.dev`, which redirects
  from `thejjw.github.io`. Both addresses work.
