import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { makeSamplePdf, makeSamplePng, makeSampleSvg } from './samples.mjs';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const manifest = JSON.parse(
  await readFile(path.join(repoRoot, 'artcraft', 'manifest.json'), 'utf8')
);
const siteBase = manifest.siteBase ?? '/';

/** How each application signals that it finished starting up. */
const READY = {
  photocraft: 'window.wasmBindings !== undefined',
  vectorcraft: 'window.wasmBindings !== undefined',
  pdfcraft: 'window.wasmBindings !== undefined',
  designcraft: 'window.wasmBindings !== undefined',
  filmcraft: 'window.filmcraftLoad && window.filmcraftLoad.readyMs > 0',
  lightcraft:
    'window.lightcraftModule !== undefined && typeof window.lightcraft.command === "function"',
  effectcraft: 'window.effectcraftLoad && window.effectcraftLoad.readyMs > 0',
};

/**
 * The operation every application can perform in a test.
 *
 * The click positions belong to the pinned upstream versions and to the
 * 1280x720 viewport of the test configuration. `changed` is the share of
 * the screen that has to differ afterwards.
 */
const OPERATIONS = {
  photocraft: {
    kind: 'drop',
    what: 'a PNG file',
    file: () => ({
      bytes: Array.from(makeSamplePng()),
      name: 'sample.png',
      type: 'image/png',
    }),
    changed: 0.05,
  },
  vectorcraft: {
    kind: 'drop',
    what: 'an SVG file',
    file: () => ({
      bytes: Array.from(makeSampleSvg()),
      name: 'sample.svg',
      type: 'image/svg+xml',
    }),
    changed: 0.05,
  },
  pdfcraft: {
    kind: 'drop',
    what: 'a PDF file',
    file: () => ({
      bytes: Array.from(makeSamplePdf()),
      name: 'sample.pdf',
      type: 'application/pdf',
    }),
    changed: 0.05,
  },
  designcraft: {
    kind: 'click',
    what: 'the "Open sample magazine" button',
    at: { x: 333, y: 196 },
    changed: 0.05,
  },
  filmcraft: {
    kind: 'click',
    what: 'a clip in the timeline',
    at: { x: 670, y: 555 },
    // The inspector on the right fills in when a clip is selected. The
    // change is measured there, where it happens, instead of over the
    // whole window.
    region: { x: 1000, y: 50, width: 280, height: 300 },
    changed: 0.01,
  },
  lightcraft: { kind: 'command' },
  effectcraft: { kind: 'api' },
};

/** Collect the failures of a page: script errors and missing files. */
function watch(page, app) {
  const errors = [];
  const failed = [];
  // Upstream asks for these files only when they are there; a host that
  // does not have them answers with a 404 and the app carries on.
  const optional = ['fonts/manifest.txt', ...(app.optionalAssets ?? [])];
  const isOptional = (url) =>
    optional.some((name) => url && url.endsWith(name));

  page.on('pageerror', (error) => errors.push(`page error: ${error}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    if (isOptional(message.location()?.url)) return;
    errors.push(`console: ${message.text()}`);
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    if (isOptional(response.url())) return;
    failed.push(`${response.status()} ${response.url()}`);
  });
  return { errors, failed };
}

/** Drop a file on the canvas, the way a user drags one into the window. */
async function dropFile(page, file) {
  await page.evaluate(({ bytes, name, type }) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array(bytes)], name, { type }));
    const canvas = document.querySelector('canvas');
    for (const kind of ['dragenter', 'dragover', 'drop']) {
      canvas.dispatchEvent(
        new DragEvent(kind, {
          dataTransfer: transfer,
          bubbles: true,
          cancelable: true,
        })
      );
    }
  }, file);
}

/**
 * The share of pixels that differ between two screenshots. The browser
 * decodes them, so the test needs no image library.
 */
async function pixelDifference(helper, before, after) {
  return helper.evaluate(
    async ({ first, second }) => {
      const load = (data) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = `data:image/png;base64,${data}`;
        });
      const firstImage = await load(first);
      const secondImage = await load(second);
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(firstImage.width, secondImage.width);
      canvas.height = Math.min(firstImage.height, secondImage.height);
      const context = canvas.getContext('2d');
      context.drawImage(firstImage, 0, 0);
      const before = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      ).data;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(secondImage, 0, 0);
      const after = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      ).data;
      let different = 0;
      for (let index = 0; index < before.length; index += 4) {
        if (
          before[index] !== after[index] ||
          before[index + 1] !== after[index + 1] ||
          before[index + 2] !== after[index + 2]
        ) {
          different += 1;
        }
      }
      return different / (canvas.width * canvas.height);
    },
    { first: before.toString('base64'), second: after.toString('base64') }
  );
}

test.describe('landing page', () => {
  test('lists every application with a working launch link', async ({
    page,
    request,
  }) => {
    const response = await page.goto(`${siteBase}crafting/`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText('ArtCraft Creative Suite');

    const cards = page.locator('.card');
    await expect(cards).toHaveCount(manifest.apps.length);

    for (const app of manifest.apps) {
      const card = page.locator(`.card[data-app="${app.id}"]`);
      await expect(card).toBeVisible();
      await expect(card.locator('h2')).toHaveText(app.name);
      await expect(card.locator('.badge.version')).toHaveText(`v${app.version}`);

      const launch = card.locator('a.launch');
      await expect(launch).toHaveAttribute('href', `${siteBase}${app.id}/`);
      await expect(
        card.getByRole('link', { name: 'Source' })
      ).toHaveAttribute('href', app.repo);

      const entry = await request.get(`${siteBase}${app.id}/`);
      expect(entry.status(), `${app.id} entry point`).toBe(200);
    }
  });
});

for (const app of manifest.apps) {
  test.describe(app.name, () => {
    test('starts up and renders', async ({ page }) => {
      const { errors, failed } = watch(page, app);
      const response = await page.goto(`${siteBase}${app.id}/`);
      expect(response?.status()).toBe(200);

      await page.waitForFunction(READY[app.id], undefined, { timeout: 180000 });

      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();
      const size = await canvas.evaluate((element) => ({
        width: element.width,
        height: element.height,
      }));
      expect(size.width).toBeGreaterThan(0);
      expect(size.height).toBeGreaterThan(0);

      expect(failed, 'missing assets').toEqual([]);
      expect(errors, 'script errors').toEqual([]);
    });

    test('performs a real operation', async ({ page }) => {
      const operation = OPERATIONS[app.id];
      const { errors } = watch(page, app);
      await page.goto(`${siteBase}${app.id}/`);
      await page.waitForFunction(READY[app.id], undefined, { timeout: 180000 });

      if (operation.kind === 'api') {
        const result = await page.evaluate(async (bytes) => {
          const file = new File([new Uint8Array(bytes)], 'sample.png', {
            type: 'image/png',
          });
          await window.effectcraft.addFile(file, 'sample.png');
          const files = await window.effectcraft.files();
          return { files, info: window.effectcraft.info() };
        }, Array.from(makeSamplePng()));

        expect(result.files.length, 'the file was added').toBeGreaterThan(0);
        expect(result.info.crossOriginIsolated).toBe(false);
      } else if (operation.kind === 'command') {
        const info = await page.evaluate(async () =>
          window.lightcraft.command('library.info', '{}')
        );
        expect(typeof info).toBe('string');
        expect(() => JSON.parse(info)).not.toThrow();
      } else {
        const helper = await page.context().newPage();
        const shot = (clip) => page.screenshot(clip ? { clip } : {});
        const before = await shot(operation.region);
        if (operation.kind === 'drop') {
          await dropFile(page, operation.file());
        } else {
          await page.mouse.click(operation.at.x, operation.at.y);
        }
        await page.waitForTimeout(8000);
        const after = await shot(operation.region);
        const difference = await pixelDifference(helper, before, after);
        await helper.close();
        expect(
          difference,
          `${app.id} did not react to ${operation.what}`
        ).toBeGreaterThan(operation.changed);
      }

      expect(errors, 'script errors').toEqual([]);
    });
  });
}
