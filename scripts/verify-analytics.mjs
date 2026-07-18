import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const distDirectory = fileURLToPath(new URL('../dist', import.meta.url));
const loaderPattern =
  /https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=([^\s"'&<>]*)/g;
const configPattern = /gtag\(\s*['"]config['"]\s*,\s*['"]([^'"]*)['"]\s*\)/g;
const measurementIdPattern = /^G-[A-Z0-9]+$/;

/** Extracts every measurement ID used by a pattern in an HTML document. */
function extractIds(html, pattern) {
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

const indexFile = path.join(distDirectory, 'index.html');
const indexHtml = await readFile(indexFile, 'utf8');
const indexLoaderIds = extractIds(indexHtml, loaderPattern);
const indexConfigIds = extractIds(indexHtml, configPattern);

if (indexLoaderIds.length === 0 && indexConfigIds.length === 0) {
  console.log('Google Analytics is disabled in index.html.');
  process.exit(0);
}

if (
  indexLoaderIds.length !== 1 ||
  indexConfigIds.length !== 1 ||
  !measurementIdPattern.test(indexLoaderIds[0]) ||
  !measurementIdPattern.test(indexConfigIds[0]) ||
  indexLoaderIds[0] !== indexConfigIds[0]
) {
  throw new Error('index.html must load and configure one matching Google tag');
}

const measurementId = indexLoaderIds[0];
console.log(`Verified Google Analytics ${measurementId} in index.html.`);
