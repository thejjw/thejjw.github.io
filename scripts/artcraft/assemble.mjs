import {
  copyFile,
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
} from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderLanding } from './render-landing.mjs';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const manifestPath = path.join(repoRoot, 'artcraft', 'manifest.json');
const stageDir = path.join(repoRoot, '.artcraft', 'stage');

/** Total size of a directory tree, in bytes. */
async function directorySize(directory) {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) total += await directorySize(target);
    else total += (await stat(target)).size;
  }
  return total;
}

/**
 * Copy the staged applications into the site and render the landing page.
 * The site directory must already contain the portfolio build.
 */
export async function assemble(distDir, options = {}) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const deployed = [];

  for (const app of manifest.apps) {
    const staged = path.join(stageDir, app.id);
    if (!existsSync(staged)) {
      if (options.requireAll) {
        throw new Error(`${app.id} is not staged; run fetch first`);
      }
      console.warn(`! ${app.id} is not staged, skipping`);
      continue;
    }
    const target = path.join(distDir, app.id);
    await rm(target, { recursive: true, force: true });
    await mkdir(path.dirname(target), { recursive: true });
    await cp(staged, target, { recursive: true });
    const size = await directorySize(target);
    deployed.push({ ...app, bytes: size });
    console.log(
      `+ ${app.id} ${app.version} -> ${path.relative(repoRoot, target)} (${(
        size /
        (1024 * 1024)
      ).toFixed(1)} MiB)`
    );
  }

  const landing = path.join(distDir, 'crafting');
  await rm(landing, { recursive: true, force: true });
  await mkdir(path.join(landing, 'icons'), { recursive: true });

  // The application icons come from the pinned upstream tags.
  const iconSource = path.join(repoRoot, '.artcraft', 'icons');
  if (existsSync(iconSource)) {
    for (const file of await readdir(iconSource)) {
      await copyFile(
        path.join(iconSource, file),
        path.join(landing, 'icons', file)
      );
    }
  }

  await renderLanding(landing, { distDir });
  console.log(
    `+ landing page -> ${path.relative(repoRoot, landing)} (${deployed.length} apps)`
  );

  return deployed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const distIndex = process.argv.indexOf('--dist');
  const distDir =
    distIndex === -1
      ? path.join(repoRoot, 'dist')
      : path.resolve(process.argv[distIndex + 1]);
  const requireAll = process.argv.includes('--require-all');
  await assemble(distDir, { requireAll });
}
