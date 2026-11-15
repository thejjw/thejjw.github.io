import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const manifestPath = path.join(repoRoot, 'artcraft', 'manifest.json');

/** Compare two dotted versions; prereleases sort before their release. */
function compareVersions(left, right) {
  const parse = (value) => {
    const [core, pre] = value.split('-');
    return {
      numbers: core.split('.').map((part) => Number(part) || 0),
      prerelease: pre ?? null,
    };
  };
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < Math.max(a.numbers.length, b.numbers.length); index += 1) {
    const difference =
      (a.numbers[index] ?? 0) - (b.numbers[index] ?? 0);
    if (difference !== 0) return difference;
  }
  if (a.prerelease === b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;
  return a.prerelease < b.prerelease ? -1 : 1;
}

/** The latest release of a repository, or null. */
async function latestRelease(slug) {
  const response = await fetch(
    `https://api.github.com/repos/${slug}/releases/latest`,
    { headers: { 'User-Agent': 'artcraft-update-check' } }
  );
  if (!response.ok) return null;
  return response.json();
}

/** The web build asset of a release, or null. */
function webAsset(release, appId) {
  return (release.assets || []).find((asset) =>
    new RegExp(`^${appId}-web-.*\\.zip$`).test(asset.name)
  );
}

/** SHA-256 of a downloaded file. */
async function sha256(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
  const hash = createHash('sha256');
  hash.update(Buffer.from(await response.arrayBuffer()));
  return hash.digest('hex');
}

/** Open an issue that lists the available updates. */
async function openIssue(body) {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!token || !repository) {
    console.log('no GitHub token available, skipping the issue');
    return;
  }
  const response = await fetch(
    `https://api.github.com/repos/${repository}/issues`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'artcraft-update-check',
      },
      body: JSON.stringify({
        title: 'New upstream releases are available for the ArtCraft suite',
        body,
      }),
    }
  );
  if (!response.ok) {
    throw new Error(`could not open the issue: ${response.status}`);
  }
  const issue = await response.json();
  console.log(`opened issue #${issue.number}: ${issue.html_url}`);
}

/**
 * Rewrite the pinned fields of one manifest entry in place. Edits the text
 * rather than re-serialising, so the file keeps its formatting.
 */
async function applyUpdate({ app, release, asset, digest }) {
  const text = await readFile(manifestPath, 'utf8');
  const start = text.indexOf(`"id": "${app.id}"`);
  const end = text.indexOf('}', start);
  const block = text
    .slice(start, end)
    .replace(/"tag": "[^"]*"/, `"tag": "${release.tag_name}"`)
    .replace(/"version": "[^"]*"/, `"version": "${release.tag_name.replace(/^v/, '')}"`)
    .replace(/"asset": "[^"]*"/, `"asset": "${asset.name}"`)
    .replace(/"sha256": "[^"]*"/, `"sha256": "${digest}"`)
    .replace(/"releaseUrl": "[^"]*"/, `"releaseUrl": "${release.html_url}"`);
  await writeFile(manifestPath, text.slice(0, start) + block + text.slice(end));
}

// --app <id> limits the check to one application; --apply (which needs
// --app) writes the new pin into the manifest instead of reporting it.
const appIndex = process.argv.indexOf('--app');
const onlyApp = appIndex === -1 ? null : process.argv[appIndex + 1];
const apply = process.argv.includes('--apply');
if (apply && !onlyApp) {
  console.error('--apply needs --app <id>: update one application per commit');
  process.exit(2);
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const selected = manifest.apps.filter((app) => !onlyApp || app.id === onlyApp);
if (selected.length === 0) {
  console.error(`no application with the id "${onlyApp}"`);
  process.exit(2);
}
const updates = [];

for (const app of selected) {
  const slug = app.repo.replace('https://github.com/', '').replace(/\/$/, '');
  const release = await latestRelease(slug);
  if (!release) {
    console.log(`${app.id}: no release found`);
    continue;
  }
  const latest = release.tag_name.replace(/^v/, '');
  const pinned = app.version;
  if (compareVersions(latest, pinned) <= 0) {
    console.log(`${app.id}: up to date (${pinned})`);
    continue;
  }
  // A held application stays on its pin (e.g. upstream ships a broken web
  // build); it is reported but never counted as an update.
  if (app.hold) {
    console.log(`${app.id}: held at ${pinned}, ${latest} available (${app.hold})`);
    continue;
  }
  const asset = webAsset(release, app.id);
  if (!asset) {
    console.log(`${app.id}: ${release.tag_name} has no web build`);
    continue;
  }
  const digest = await sha256(asset.browser_download_url);
  updates.push({ app, release, asset, digest });
  console.log(`${app.id}: ${pinned} -> ${latest}`);
}

if (apply) {
  for (const update of updates) {
    await applyUpdate(update);
    console.log(`${update.app.id}: manifest pinned to ${update.release.tag_name}`);
  }
  process.exit(0);
}

if (updates.length === 0) {
  console.log('every application is up to date');
  if (process.env.GITHUB_STEP_SUMMARY) {
    await writeFile(
      process.env.GITHUB_STEP_SUMMARY,
      '## ArtCraft update check\n\nEvery application is on its latest release.\n',
      { flag: 'a' }
    );
  }
  process.exit(0);
}

const rows = updates
  .map(
    ({ app, release, asset, digest }) =>
      `| ${app.name} | ${app.version} | [${release.tag_name}](${release.html_url}) | \`${asset.name}\` | \`${digest}\` |`
  )
  .join('\n');
const commands = updates
  .map(({ app }) => `node scripts/artcraft/check-updates.mjs --apply --app ${app.id}`)
  .join('\n');
const body = `New upstream releases are available.

| Application | Pinned | Latest | Asset | SHA-256 |
| --- | --- | --- | --- | --- |
${rows}

Follow "Refreshing the suite" in \`artcraft/README.md\`. Each application is pinned with:

\`\`\`sh
${commands}
\`\`\`
`;

console.log(`\n${body}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  await writeFile(
    process.env.GITHUB_STEP_SUMMARY,
    `## ArtCraft update check\n\n${body}`,
    { flag: 'a' }
  );
}

try {
  await openIssue(body);
} catch (error) {
  // No issue could be opened (Issues are disabled on this fork). The run
  // still fails on purpose: the failure is the notification that updates
  // exist, and the warning says which ones.
  const names = updates.map(({ app, release }) => `${app.id} ${release.tag_name}`);
  console.log(
    `::warning title=ArtCraft updates available::${names.join(', ')}. ` +
      `No issue was opened (${error.message}); the job summary lists the details.`
  );
  process.exit(1);
}await openIssue(body);
