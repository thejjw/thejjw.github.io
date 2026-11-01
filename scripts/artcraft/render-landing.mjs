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

/** Join names for prose: "A, B and C". */
function listNames(names) {
  if (names.length < 2) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
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
        <h3>${escape(app.name)}</h3>
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
          )}" rel="nofollow noopener noreferrer" target="_blank">Source</a>
          <a class="link-quiet" href="${escape(
            app.releaseUrl
          )}" rel="nofollow noopener noreferrer" target="_blank">Release notes</a>
          ${extra}
        </p>
        <p class="license">License: ${app.license
          .map((entry) => escape(entry))
          .join(', ')} &middot; &copy; the ${escape(
    app.name
  )} authors</p>
      </article>`;
}

/** One entry in the "not hosted here" catalog. */
function catalogCard(entry) {
  return `        <li class="catalog-card" data-app="${escape(entry.id)}">
          <h3>${escape(entry.name)}</h3>
          <p class="summary">${escape(entry.summary)}</p>
          <p class="actions">
            <a class="link-quiet" href="${escape(
              entry.repo
            )}" rel="nofollow noopener noreferrer" target="_blank">GitHub</a>
          </p>
        </li>`;
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

  // The landing page is grouped by the manifest's categories. A missing or
  // unknown category, or a category without entries, is a manifest error: the
  // build fails instead of filing an application into the wrong group.
  const categories = manifest.categories ?? [];
  const entries = [...manifest.apps, ...(manifest.catalog ?? [])];
  const known = new Map(categories.map((category) => [category.id, category]));
  for (const entry of entries) {
    if (!entry.category) {
      throw new Error(
        `${entry.id} has no category; add one of ${[...known.keys()].join(', ')}`
      );
    }
    if (!known.has(entry.category)) {
      throw new Error(`${entry.id} has the unknown category "${entry.category}"`);
    }
  }
  for (const category of categories) {
    if (!entries.some((entry) => entry.category === category.id)) {
      throw new Error(`the category "${category.id}" has no entries`);
    }
  }

  const cardsById = new Map(
    manifest.apps.map((app, index) => [app.id, card(app, icons[index], siteBase)])
  );

  /** One category: its hosted applications, then the projects not hosted. */
  function categorySection(category) {
    const hosted = manifest.apps
      .filter((app) => app.category === category.id)
      .map((app) => cardsById.get(app.id))
      .join('\n');
    const notHosted = (manifest.catalog ?? [])
      .filter((entry) => entry.category === category.id)
      .map(catalogCard)
      .join('\n');
    const catalogBlock = notHosted
      ? `      <p class="catalog-note">Not hosted here: these ArtCraft projects are not part of this deployment, the links go to their source repositories.</p>
      <ul class="catalog-list">
${notHosted}
      </ul>
`
      : '';
    return `    <section class="group" data-category="${escape(category.id)}" aria-label="${escape(category.name)}">
      <h2>${escape(category.name)}</h2>
      <p class="group-lede">${escape(category.lede)}</p>
      <div class="grid">
${hosted}
      </div>
${catalogBlock}    </section>`;
  }

  const sections = categories.map(categorySection).join('\n\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ArtCraft Creative Suite</title>
  <meta name="description" content="${escape(
    listNames(manifest.apps.map((app) => app.name))
  )} running in the browser as WebAssembly.">
  <link rel="stylesheet" href="crafting.css">
</head>
<body>
  <header class="page-header">
    <p class="eyebrow"><a href="${escape(siteBase)}">&larr; Back to the site</a></p>
    <h1>ArtCraft Creative Suite</h1>
    <p class="lede">
      ${manifest.apps.length} open-source creative tools, each running entirely in
      your browser as WebAssembly. Nothing is uploaded: files you open stay on
      your device.
    </p>
  </header>

  <main>
${sections}

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
      <a href="https://github.com/storytold" rel="nofollow noopener noreferrer" target="_blank">github.com/storytold</a>.
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
