import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const manifestPath = path.join(repoRoot, 'artcraft', 'manifest.json');
const stylePath = path.join(repoRoot, 'artcraft', 'landing', 'crafting.css');

/** Escape text for safe inclusion in HTML. */
function escape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** The icon file an app ships, if any. */
async function findIcon(appDirectory) {
  const candidates = [
    'favicon.svg',
    'favicon.png',
    'icon-256.png',
    'icon-512.png',
    'logo.png',
  ];
  if (!existsSync(appDirectory)) return null;
  const files = await readdir(appDirectory);
  for (const candidate of candidates) {
    if (files.includes(candidate)) return candidate;
  }
  return null;
}

/** A generated monogram, used when an app ships no icon. */
function monogram(app) {
  const letter = app.name.charAt(0);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${escape(
    app.name
  )}">
  <rect width="64" height="64" rx="14" fill="${app.accent}"/>
  <text x="32" y="43" font-family="system-ui, sans-serif" font-size="34" font-weight="700" text-anchor="middle" fill="#111827">${escape(
    letter
  )}</text>
</svg>
`;
  return Buffer.from(svg, 'utf8');
}

/** One card per application. */
function card(app, iconName, siteBase) {
  const badges = app.requires
    .map((requirement) => `<span class="badge">${escape(requirement)}</span>`)
    .join('\n          ');
  const notes = app.notes
    ? `<p class="notes">${escape(app.notes)}</p>`
    : '';
  const status = app.status === 'available' ? '' : `<span class="badge warn">${escape(
    app.status
  )}</span>`;
  const extra = (app.extraLinks || [])
    .map(
      (link) =>
        `<a class="link-quiet" href="${escape(
          `${siteBase}${app.id}/${link.path}`
        )}">${escape(link.label)}</a>`
    )
    .join('\n          ');
  return `      <article class="card" data-app="${escape(app.id)}">
        <a class="card-icon" href="${escape(`${siteBase}${app.id}/`)}" aria-label="Launch ${escape(
    app.name
  )}">
          <img src="icons/${escape(iconName)}" alt="" width="56" height="56" loading="lazy">
        </a>
        <h2>${escape(app.name)}</h2>
        <p class="summary">${escape(app.summary)}</p>
        <p class="meta">
          <span class="badge version">v${escape(app.version)}</span>
          ${badges}
          ${status}
        </p>
        ${notes}
        <p class="actions">
          <a class="launch" href="${escape(`${siteBase}${app.id}/`)}">Launch</a>
          <a class="link-quiet" href="${escape(
            app.repo
          )}" rel="noopener noreferrer" target="_blank">Source</a>
          <a class="link-quiet" href="${escape(
            app.releaseUrl
          )}" rel="noopener noreferrer" target="_blank">Release notes</a>
          ${extra}
        </p>
        <p class="license">License: ${app.license
          .map((entry) => escape(entry))
          .join(', ')} &middot; &copy; the ${escape(
    app.name
  )} authors</p>
      </article>`;
}

/**
 * Render the landing page for the pinned apps.
 * Writes index.html and the stylesheet into the given directory.
 */
export async function renderLanding(outDir, options = {}) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const siteBase = manifest.siteBase ?? '/';
  const iconDir = path.join(outDir, 'icons');
  await mkdir(iconDir, { recursive: true });

  const icons = [];
  for (const app of manifest.apps) {
    // An icon that was prepared from the upstream repository wins over the
    // one the release archive may carry.
    const prepared = (await readdir(iconDir)).find((file) =>
      file.startsWith(`${app.id}.`)
    );
    if (prepared) {
      icons.push(prepared);
      continue;
    }
    const appDirectory = path.join(options.distDir ?? 'dist', app.id);
    const icon = await findIcon(appDirectory);
    if (icon) {
      await copyFile(
        path.join(appDirectory, icon),
        path.join(iconDir, `${app.id}${path.extname(icon)}`)
      );
      icons.push(`${app.id}${path.extname(icon)}`);
    } else {
      await writeFile(path.join(iconDir, `${app.id}.svg`), monogram(app));
      icons.push(`${app.id}.svg`);
    }
  }

  const cards = manifest.apps
    .map((app, index) => card(app, icons[index], siteBase))
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ArtCraft Creative Suite</title>
  <meta name="description" content="PhotoCraft, VectorCraft, FilmCraft, LightCraft, PdfCraft, EffectCraft and DesignCraft running in the browser as WebAssembly.">
  <link rel="stylesheet" href="crafting.css">
</head>
<body>
  <header class="page-header">
    <p class="eyebrow"><a href="${escape(siteBase)}">&larr; Back to the site</a></p>
    <h1>ArtCraft Creative Suite</h1>
    <p class="lede">
      Seven open-source creative tools, each running entirely in your browser as
      WebAssembly. Nothing is uploaded: files you open stay on your device.
    </p>
  </header>

  <main>
    <section class="grid" aria-label="Applications">
${cards}
    </section>

    <section class="notes-block">
      <h2>Before you start</h2>
      <ul>
        <li>
          The editors render with WebGPU when the browser offers it and fall back
          to WebGL2 otherwise. PhotoCraft also accepts
          <code>?webgl</code> and <code>?cpu</code> in its URL.
        </li>
        <li>
          All applications run in your browser only. There is no server-side
          document storage, so save or export before you close the tab.
        </li>
        <li>
          FilmCraft decodes video with WebCodecs, which means Chromium-based
          browsers today. The other applications work in current Firefox and
          Safari as well.
        </li>
        <li>
          EffectCraft installs a service worker for offline use. Use its
          &ldquo;no service worker&rdquo; link if a cached version gets in the way
          after an update.
        </li>
        <li>
          These are community deployments of the upstream projects. The upstream
          authors ship the official binaries; this site only republishes their
          release builds.
        </li>
      </ul>
    </section>
  </main>

  <footer>
    <p>
      Every application is &copy; its upstream authors and is redistributed under
      its own license (Apache-2.0 and MIT). Source:
      <a href="https://github.com/storytold" rel="noopener noreferrer" target="_blank">github.com/storytold</a>.
    </p>
  </footer>
</body>
</html>
`;

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'index.html'), html);
  await copyFile(stylePath, path.join(outDir, 'crafting.css'));
  return { outDir, apps: manifest.apps.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outIndex = process.argv.indexOf('--out');
  const outDir =
    outIndex === -1
      ? path.join(repoRoot, 'dist', 'crafting')
      : path.resolve(process.argv[outIndex + 1]);
  const distIndex = process.argv.indexOf('--dist');
  const distDir =
    distIndex === -1 ? path.join(repoRoot, 'dist') : path.resolve(process.argv[distIndex + 1]);
  const result = await renderLanding(outDir, { distDir });
  console.log(
    `landing page written to ${path.relative(repoRoot, result.outDir)} (${result.apps} apps)`
  );
}
