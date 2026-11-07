import { test, expect, chromium } from '@playwright/test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('per-site access prototype overrides a page title and restores it after SPA updates and reloads', async () => {
  const profile = await mkdtemp(path.join(os.tmpdir(), 'keybar-title-prototype-'));
  const sourceExtensionPath = path.resolve('prototypes/tab-title-rename');
  const extensionPath = path.join(profile, 'extension');
  let context;

  try {
    await cp(sourceExtensionPath, extensionPath, { recursive: true });
    const manifestPath = path.join(extensionPath, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.host_permissions = ['http://title-prototype.test/*', 'http://other-title.test/*'];
    await writeFile(manifestPath, JSON.stringify(manifest));

    context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium',
      headless: true,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    await context.route('http://title-prototype.test/**', (route) => {
      const pageTitle =
        new URL(route.request().url()).pathname === '/second' ? 'Second page title' : 'Original page title';
      return route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><title>${pageTitle}</title><main>Allowed page</main>`,
      });
    });
    await context.route('http://other-title.test/**', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><title>Other site title</title><main>Other site</main>',
      }),
    );

    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const page = await context.newPage();
    await page.goto('http://title-prototype.test/regular');
    const activeTab = await worker.evaluate(
      async () => (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0],
    );
    const popup = await context.newPage();
    await popup.addInitScript((tab) => {
      const query = chrome.tabs.query.bind(chrome.tabs);
      chrome.tabs.query = (queryInfo, callback) => {
        if (queryInfo?.active && queryInfo?.lastFocusedWindow) {
          if (callback) {
            callback([tab]);
            return;
          }
          return Promise.resolve([tab]);
        }

        return query(queryInfo, callback);
      };
    }, activeTab);
    await popup.goto(`chrome-extension://${new URL(worker.url()).host}/popup.html`);
    await popup.getByLabel('Custom tab name').fill('Prototype title');
    await popup.getByRole('button', { name: 'Allow this site and apply' }).click();
    await expect(popup.getByRole('status')).toHaveText('Custom title applied.');
    await expect(page).toHaveTitle('Prototype title');
    await page.evaluate(() => {
      document.title = 'SPA provided title';
    });
    await expect(page).toHaveTitle('Prototype title');

    await page.reload();
    await expect(page).toHaveTitle('Prototype title');
    await page.goto('http://title-prototype.test/second');
    await expect(page).toHaveTitle('Prototype title');
    await popup.getByRole('button', { name: 'Restore page title' }).click();
    await expect(page).toHaveTitle('Second page title');

    await popup.getByRole('button', { name: 'Allow this site and apply' }).click();
    await expect(popup.getByRole('status')).toHaveText('Custom title applied.');
    await page.goto('http://other-title.test/regular');
    await expect(page).toHaveTitle('Other site title');
    await popup.getByRole('button', { name: 'Restore page title' }).click();
    await expect(popup.getByRole('status')).toHaveText('No active custom title on this page.');
    await expect(page).toHaveTitle('Other site title');
  } finally {
    await context?.close();
    await rm(profile, { recursive: true, force: true });
  }
});

test('the prototype cannot inject into restricted Chrome pages', async () => {
  const profile = await mkdtemp(path.join(os.tmpdir(), 'keybar-title-restricted-'));
  const extensionPath = path.resolve('prototypes/tab-title-rename');
  let context;

  try {
    context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium',
      headless: true,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const page = await context.newPage();
    await page.goto('chrome://version');
    const tabId = await worker.evaluate(
      async () => (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]?.id,
    );
    const injection = await worker.evaluate(async (id) => {
      try {
        await chrome.scripting.executeScript({ target: { tabId: id }, func: () => (document.title = 'Not allowed') });
        return 'allowed';
      } catch (error) {
        return error.message;
      }
    }, tabId);
    expect(injection).not.toBe('allowed');
  } finally {
    await context?.close();
    await rm(profile, { recursive: true, force: true });
  }
});
