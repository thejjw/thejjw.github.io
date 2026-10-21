import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const manifestPath = path.join(repoRoot, 'artcraft', 'manifest.json');
const workDir = path.join(repoRoot, '.artcraft');
const cacheDir = path.join(workDir, 'cache');
const stageDir = path.join(workDir, 'stage');

/** Read the pinned upstream manifest. */
async function readManifest() {
  return JSON.parse(await readFile(manifestPath, 'utf8'));
}

/** Run a command and resolve with its stdout; rejects on a non-zero exit. */
function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else
        reject(
          new Error(`${command} exited with ${code}: ${stderr.trim()}`)
        );
    });
  });
}

/** SHA-256 of a file, as lowercase hex. */
async function sha256(file) {
  const hash = createHash('sha256');
  hash.update(await readFile(file));
  return hash.digest('hex');
}

/** Download a URL into a file; skips the download when the file exists. */
async function download(url, target) {
  if (existsSync(target)) return target;
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`GET ${url} failed with ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  return target;
}

/** Unpack a zip archive into a directory (unzip, else bsdtar). */
async function unzip(archive, target) {
  await mkdir(target, { recursive: true });
  try {
    await run('unzip', ['-q', '-o', archive, '-d', target]);
  } catch {
    await run('tar', ['-xf', archive, '-C', target]);
  }
}

/** The single directory the release zip wraps its site in. */
async function wrapperDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const dirs = entries.filter((entry) => entry.isDirectory());
  if (dirs.length !== 1) {
    throw new Error(
      `expected one directory in ${directory}, found ${dirs.length}`
    );
  }
  return path.join(directory, dirs[0].name);
}

/**
 * Drop files that only make sense on other hosts, or that GitHub Pages
 * would serve without the matching Content-Encoding.
 */
async function pruneAppFiles(appDirectory) {
  const removed = [];
  const remove = async (relative) => {
    const target = path.join(appDirectory, relative);
    if (existsSync(target)) {
      await rm(target, { recursive: true, force: true });
      removed.push(relative);
    }
  };

  // Apache and Netlify header rules: GitHub Pages has its own fixed headers.
  await remove('.htaccess');
  await remove('_headers');

  // Precompressed copies of files that are served next to their plain
  // counterpart. GitHub Pages does not send Content-Encoding for them, so
  // they would only waste bandwidth.
  for (const entry of await readdir(appDirectory, { withFileTypes: true })) {
    if (entry.isFile() && /\.gz$|\.br$/.test(entry.name)) {
      await remove(entry.name);
    }
  }

  if (removed.length) {
    console.log(`    pruned: ${removed.join(', ')}`);
  }
  return removed;
}

/**
 * Fetch one app's pinned web build, verify it and stage it.
 * The manifest pins the version and the SHA-256 of the release asset.
 */
async function fetchApp(app, options) {
  const slug = app.repo.replace('https://github.com/', '').replace(/\/$/, '');
  const release = `https://github.com/${slug}/releases/download/${app.tag}`;
  const archive = path.join(cacheDir, app.asset);
  const sums = path.join(cacheDir, `${app.id}-SHA256SUMS.txt`);

  console.log(`> ${app.id} ${app.tag}`);
  if (!options.offline) {
    await download(`${release}/${app.asset}`, archive);
    await download(`${release}/SHA256SUMS.txt`, sums);
  } else if (!existsSync(archive)) {
    throw new Error(`${app.asset} is not cached; run without --offline`);
  }

  const digest = await sha256(archive);
  if (digest !== app.sha256) {
    throw new Error(
      `checksum mismatch for ${app.asset}:\n  expected ${app.sha256}\n  actual   ${digest}`
    );
  }

  // Cross-check the pinned digest against the checksum file upstream ships.
  if (existsSync(sums)) {
    const line = (await readFile(sums, 'utf8'))
      .split('\n')
      .find((entry) => entry.endsWith(`  ${app.asset}`));
    const upstream = line ? line.split(/\s+/)[0] : null;
    if (upstream && upstream !== app.sha256) {
      throw new Error(
        `upstream checksum for ${app.asset} (${upstream}) differs from the pinned digest`
      );
    }
  }
  console.log(`    sha256 ok: ${digest}`);

  const target = path.join(stageDir, app.id);
  await rm(target, { recursive: true, force: true });
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'artcraft-'));
  try {
    await unzip(archive, temporary);
    const wrapper = await wrapperDirectory(temporary);
    await mkdir(path.dirname(target), { recursive: true });
    await rename(wrapper, target);
    await pruneAppFiles(target);
    console.log(`    staged: ${path.relative(repoRoot, target)}`);
    return { ...app, staged: target };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

/** Parse the command line: --app <id>, --offline, --force. */
function parseArgs(argv) {
  const options = { apps: [], offline: false, force: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--app') options.apps.push(argv[++index]);
    else if (arg === '--offline') options.offline = true;
    else if (arg === '--force') options.force = true;
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));
const manifest = await readManifest();
const selected = manifest.apps.filter(
  (app) => options.apps.length === 0 || options.apps.includes(app.id)
);
if (selected.length === 0) {
  throw new Error(`no app matched ${options.apps.join(', ')}`);
}

await mkdir(cacheDir, { recursive: true });
await mkdir(stageDir, { recursive: true });

for (const app of selected) {
  if (options.force) {
    await rm(path.join(cacheDir, app.asset), { force: true });
  }
  await fetchApp(app, options);
}

console.log(`staged ${selected.length} app(s) in ${path.relative(repoRoot, stageDir)}`);
