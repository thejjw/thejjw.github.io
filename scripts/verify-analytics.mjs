import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const distDirectory = fileURLToPath(new URL('../dist', import.meta.url));
const loaderPattern =
  /https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=(G-[A-Z0-9]+)/g;
const configPattern =
  /gtag\(\s*['"]config['"]\s*,\s*['"](G-[A-Z0-9]+)['"]\s*\)/g;

/** Recursively returns the generated HTML files beneath a directory. */
async function findHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory()
        ? findHtmlFiles(entryPath)
        : entryPath.endsWith('.html')
          ? [entryPath]
          : [];
    }),
  );

  return files.flat();
}

/** Identifies offline or vendored HTML that must not load analytics. */
function isExcluded(htmlFile) {
  const relativePath = path
    .relative(distDirectory, htmlFile)
    .replaceAll(path.sep, '/');

  return (
    relativePath === 'custom/ab_to_countries.local.html' ||
    relativePath.startsWith('tool/lib/')
  );
}

/** Extracts every measurement ID used by a pattern in an HTML document. */
function extractIds(html, pattern) {
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

/** Verifies that a page configures the expected tag exactly once. */
async function verifyPage(htmlFile, expectedId) {
  const html = await readFile(htmlFile, 'utf8');
  const loaderIds = extractIds(html, loaderPattern);
  const configIds = extractIds(html, configPattern);
  const relativePath = path.relative(distDirectory, htmlFile);

  if (
    loaderIds.length !== 1 ||
    configIds.length !== 1 ||
    loaderIds[0] !== expectedId ||
    configIds[0] !== expectedId
  ) {
    throw new Error(
      `${relativePath} must load and configure ${expectedId} exactly once`,
    );
  }
}

const indexFile = path.join(distDirectory, 'index.html');
const indexHtml = await readFile(indexFile, 'utf8');
const indexLoaderIds = extractIds(indexHtml, loaderPattern);
const indexConfigIds = extractIds(indexHtml, configPattern);

if (
  indexLoaderIds.length !== 1 ||
  indexConfigIds.length !== 1 ||
  indexLoaderIds[0] !== indexConfigIds[0]
) {
  throw new Error('index.html must load and configure one matching Google tag');
}

const measurementId = indexLoaderIds[0];
const htmlFiles = (await findHtmlFiles(distDirectory)).filter(
  (htmlFile) => !isExcluded(htmlFile),
);

await Promise.all(
  htmlFiles.map((htmlFile) => verifyPage(htmlFile, measurementId)),
);

console.log(
  `Verified Google Analytics ${measurementId} on ${htmlFiles.length} HTML pages.`,
);
