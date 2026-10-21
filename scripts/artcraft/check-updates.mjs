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

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const updates = [];

for (const app of manifest.apps) {
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
  const asset = webAsset(release, app.id);
  if (!asset) {
    console.log(`${app.id}: ${release.tag_name} has no web build`);
    continue;
  }
  const digest = await sha256(asset.browser_download_url);
  updates.push({ app, release, asset, digest });
  console.log(`${app.id}: ${pinned} -> ${latest}`);
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

const entries = updates.map(({ app, release, asset, digest }) => ({
  id: app.id,
  name: app.name,
  tag: release.tag_name,
  version: release.tag_name.replace(/^v/, ''),
  asset: asset.name,
  sha256: digest,
  repo: app.repo,
  releaseUrl: release.html_url,
  license: app.license,
  summary: app.summary,
  requires: app.requires,
  status: app.status,
  notes: app.notes,
  ...(app.optionalAssets ? { optionalAssets: app.optionalAssets } : {}),
  ...(app.extraLinks ? { extraLinks: app.extraLinks } : {}),
  accent: app.accent,
}));

const body = `New upstream releases are available. Update the pinned entries in \`artcraft/manifest.json\` and let the deploy workflow republish.

\`\`\`json
${JSON.stringify(entries, null, 2)}
\`\`\`
`;

if (process.env.GITHUB_STEP_SUMMARY) {
  await writeFile(
    process.env.GITHUB_STEP_SUMMARY,
    `## ArtCraft update check\n\n${body}`,
    { flag: 'a' }
  );
}

await openIssue(body);
