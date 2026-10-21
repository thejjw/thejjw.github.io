import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const manifestPath = path.join(repoRoot, 'artcraft', 'manifest.json');

/** References that are not files on disk and must be ignored. */
const IGNORED = /^(https?:|data:|blob:|mailto:|tel:|javascript:|#)/;

/**
 * Local file references of a document: markup attributes plus the paths that
 * its inline scripts load.
 */
function documentReferences(html) {
  const references = [];
  const attributes = /(?:src|href)\s*=\s*["']([^"']+)["']/g;
  for (const match of html.matchAll(attributes)) references.push(match[1]);
  const loaded = /(?:fetch|import|new\s+URL)\(\s*["']([^"']+)["']/g;
  for (const match of html.matchAll(loaded)) references.push(match[1]);
  const assigned = /module_or_path\s*:\s*["']([^"']+)["']/g;
  for (const match of html.matchAll(assigned)) references.push(match[1]);
  const staticImport = /\bfrom\s+["']([^"']+)["']/g;
  for (const match of html.matchAll(staticImport)) references.push(match[1]);
  return references;
}

/** Local file references a script loads. */
function scriptReferences(source) {
  const references = [];
  const loaded = /(?:fetch|import|new\s+URL)\(\s*["']([^"']+)["']/g;
  for (const match of source.matchAll(loaded)) references.push(match[1]);
  const staticImport = /\bfrom\s+["']([^"']+)["']/g;
  for (const match of source.matchAll(staticImport)) references.push(match[1]);
  return references;
}

/** Resolve a reference against the directory of the file that mentions it. */
function resolveReference(reference, baseDirectory) {
  const clean = reference.split('#')[0].split('?')[0];
  if (!clean || IGNORED.test(clean)) return null;
  if (clean.startsWith('/')) return { absolute: true, target: clean };
  return {
    absolute: false,
    target: path.resolve(baseDirectory, clean),
  };
}

/** Validate one assembled application directory. */
async function validateApp(app, distDir) {
  const problems = [];
  const appDirectory = path.join(distDir, app.id);
  const indexFile = path.join(appDirectory, 'index.html');

  if (!existsSync(indexFile)) {
    return [`${app.id}: index.html is missing`];
  }

  const html = await readFile(indexFile, 'utf8');
  const optional = app.optionalAssets || [];
  for (const reference of documentReferences(html)) {
    const resolved = resolveReference(reference, appDirectory);
    if (!resolved) continue;
    if (resolved.absolute) {
      problems.push(
        `${app.id}: index.html references the absolute path "${resolved.target}", which breaks under a subdirectory`
      );
      continue;
    }
    if (!existsSync(resolved.target)) {
      const name = path.basename(resolved.target);
      if (optional.includes(name)) {
        console.warn(`  - ${app.id}: optional asset "${name}" is not in the build`);
        continue;
      }
      problems.push(
        `${app.id}: index.html references "${reference}", which is not in the build`
      );
    }
  }

  const files = await readdir(appDirectory, { withFileTypes: true });
  const scripts = files.filter(
    (entry) => entry.isFile() && entry.name.endsWith('.js')
  );
  for (const script of scripts) {
    const scriptFile = path.join(appDirectory, script.name);
    const source = await readFile(scriptFile, 'utf8');
    for (const reference of scriptReferences(source)) {
      const resolved = resolveReference(reference, path.dirname(scriptFile));
      if (!resolved || resolved.absolute) continue;
      if (!existsSync(resolved.target)) {
        // wasm-bindgen's glue keeps a default module path that the page
        // replaces with the hashed file it ships. The default is dead code.
        if (reference.endsWith('_bg.wasm')) {
          console.warn(
            `  - ${app.id}: the default module path "${reference}" in ${script.name} is superseded by the page`
          );
          continue;
        }
        problems.push(
          `${app.id}: ${script.name} references "${reference}", which is not in the build`
        );
      }
    }
  }

  // PhotoCraft ships its module as a list of parts. The first line of the
  // list is a header that names the format and the number of parts.
  const partsFile = path.join(appDirectory, 'app', 'parts.txt');
  if (existsSync(partsFile)) {
    const parts = (await readFile(partsFile, 'utf8'))
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(1);
    for (const part of parts) {
      const target = path.join(appDirectory, 'app', part);
      if (!existsSync(target)) {
        problems.push(`${app.id}: the part "${part}" is not in the build`);
      }
    }
  }

  const wasmFiles = files.filter(
    (entry) => entry.isFile() && entry.name.endsWith('.wasm')
  );
  if (wasmFiles.length === 0) {
    problems.push(`${app.id}: no WebAssembly module in the build`);
  }

  return problems;
}

/** Validate the landing page and the links it offers. */
async function validateLanding(distDir, manifest) {
  const problems = [];
  const landingDirectory = path.join(distDir, 'crafting');
  const indexFile = path.join(landingDirectory, 'index.html');
  if (!existsSync(indexFile)) {
    return ['crafting: the landing page is missing'];
  }
  const html = await readFile(indexFile, 'utf8');
  for (const reference of documentReferences(html)) {
    const resolved = resolveReference(reference, landingDirectory);
    if (!resolved || resolved.absolute) continue;
    if (!existsSync(resolved.target)) {
      problems.push(`crafting: the landing page links to a missing file "${reference}"`);
    }
  }
  for (const app of manifest.apps) {
    const target = path.join(distDir, app.id, 'index.html');
    if (!existsSync(target)) {
      problems.push(`crafting: the launch link of ${app.id} has no page`);
    }
  }
  return problems;
}

const distIndex = process.argv.indexOf('--dist');
const distDir =
  distIndex === -1
    ? path.join(repoRoot, 'dist')
    : path.resolve(process.argv[distIndex + 1]);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

const problems = [];
for (const app of manifest.apps) {
  problems.push(...(await validateApp(app, distDir)));
}
problems.push(...(await validateLanding(distDir, manifest)));

if (problems.length) {
  console.error('validation failed:');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`validation ok: ${manifest.apps.length} applications`);
