import { test, expect } from './fixtures.mjs';

test('saved search preserves partial success, retries failure, and discards revoked late results', async ({
  extension,
}) => {
  const { context, url } = extension;
  const menu = await context.newPage();
  // Only the permission/data boundary is simulated. The shipped UI runs normally.
  await menu.addInitScript(() => {
    window.auditPermissions = ['bookmarks', 'history'];
    window.auditHistoryFails = true;
    window.auditCalls = { bookmarks: 0, history: 0 };
    const send = chrome.runtime.sendMessage.bind(chrome.runtime);
    const getAll = async () => ({ permissions: window.auditPermissions });
    chrome.permissions.getAll = getAll;
    chrome.permissions.request = async () => true;
    const listeners = [];
    const add = chrome.runtime.onMessage.addListener.bind(chrome.runtime.onMessage);
    chrome.runtime.onMessage.addListener = (listener) => {
      listeners.push(listener);
      add(listener);
    };
    window.auditChangePermissions = (permissions) => {
      window.auditPermissions = permissions;
      for (const listener of listeners) listener({ action: 'ui:permissions-changed' }, {}, () => {});
    };
    chrome.runtime.sendMessage = async (message, ...args) => {
      if (message.action === 'permissions:get-all') return { success: true, data: await getAll() };
      if (message.action === 'bookmarks:list') {
        window.auditCalls.bookmarks++;
        return {
          success: true,
          data: [
            {
              id: 'root',
              title: '',
              children: [{ id: 'saved', title: 'Quasar bookmark', url: 'https://saved.test/quasar' }],
            },
          ],
        };
      }
      if (message.action === 'history:list') {
        window.auditCalls.history++;
        if (window.auditHistoryFails) return { success: false, error: 'History unavailable' };
        const result = {
          success: true,
          data: [{ id: 'recent', title: 'Quasar history', url: 'https://recent.test/quasar' }],
        };
        if (window.auditHoldHistory)
          return new Promise((resolve) => {
            window.auditReleaseHistory = () => resolve(result);
          });
        return result;
      }
      return send(message, ...args);
    };
  });
  await menu.goto(url);
  const search = menu.getByRole('combobox');
  await search.fill('Quasar');
  await expect(menu.locator('[id="command-center-option-bookmark-saved"]')).toBeVisible();
  await expect(menu.getByRole('status').filter({ hasText: 'Some saved pages' })).toBeVisible();
  expect(await menu.evaluate(() => window.auditCalls)).toEqual({ bookmarks: 1, history: 1 });
  await menu.evaluate(() => {
    window.auditHistoryFails = false;
  });
  await search.fill('Search bookmarks and history');
  const retry = menu.locator('[id="command-center-option-search-saved-pages"]');
  await expect(retry).toBeVisible();
  await retry.click();
  await search.fill('Quasar');
  await expect(menu.locator('[id="command-center-option-history-recent"]')).toBeVisible();
  await expect(menu.getByRole('status').filter({ hasText: 'Some saved pages' })).toHaveCount(0);
  expect(await menu.evaluate(() => window.auditCalls)).toEqual({ bookmarks: 1, history: 2 });

  await menu.evaluate(() => window.auditChangePermissions(['bookmarks']));
  await expect(menu.locator('[id="command-center-option-history-recent"]')).toHaveCount(0);
  await expect(menu.locator('[id="command-center-option-bookmark-saved"]')).toBeVisible();
  await menu.evaluate(() => {
    window.auditHoldHistory = true;
    window.auditChangePermissions(['bookmarks', 'history']);
  });
  await expect.poll(() => menu.evaluate(() => Boolean(window.auditReleaseHistory))).toBe(true);
  await menu.evaluate(() => window.auditChangePermissions([]));
  await expect(menu.locator('[id="command-center-option-bookmark-saved"]')).toHaveCount(0);
  await menu.evaluate(async () => {
    window.auditReleaseHistory();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await expect(menu.locator('[id="command-center-option-history-recent"]')).toHaveCount(0);
  await menu.evaluate(() => {
    window.auditReleaseHistory = null;
    window.auditChangePermissions(['history']);
  });
  await expect.poll(() => menu.evaluate(() => Boolean(window.auditReleaseHistory))).toBe(true);
  await expect(menu.locator('[id="command-center-option-history-recent"]')).toHaveCount(0);
  await menu.evaluate(() => window.auditReleaseHistory());
  await expect(menu.locator('[id="command-center-option-history-recent"]')).toBeVisible();
});
