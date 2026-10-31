import { test, expect } from './fixtures.mjs';

test('real action injects isolated overlay, restores focus, reopens and executes a tab', async ({ extension }) => {
  const { context, id, worker } = extension;
  await context.route('https://release.test/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<title>${route.request().url().endsWith('target') ? 'Release target' : 'Release source'}</title><input id="page-input" aria-label="Page input"><button>Page button</button>`,
    }),
  );
  const target = await context.newPage();
  await target.goto('https://release.test/target');
  const page = await context.newPage();
  await page.goto('https://release.test/source');
  await page.getByRole('textbox', { name: 'Page input' }).focus();
  const cdp = await context.newCDPSession(page);
  const browserCdp = await context.browser().newBrowserCDPSession();
  const { targetInfos } = await browserCdp.send('Target.getTargets', { filter: [{ type: 'tab', exclude: false }] });
  const targetInfo = targetInfos.find((target) => target.type === 'tab' && target.url === page.url());
  expect(targetInfo).toBeDefined();
  const open = () => browserCdp.send('Extensions.triggerAction', { id, targetId: targetInfo.targetId });
  const host = page.locator(`[id="${id}-command-center-surface"]`);
  const axNodes = async () => (await cdp.send('Accessibility.getFullAXTree')).nodes;
  await open();
  await expect(host).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.inert)).toBe(true);
  await expect
    .poll(async () => (await axNodes()).some((node) => node.role?.value === 'combobox' && !node.ignored))
    .toBe(true);
  await page.keyboard.press('Escape');
  await expect(host).toBeHidden();
  await expect(page.getByRole('textbox', { name: 'Page input' })).toBeFocused();
  expect(await page.evaluate(() => document.body.inert)).toBe(false);
  await open();
  await expect(host).toBeVisible();
  await page.keyboard.type('Release target');
  await expect
    .poll(async () =>
      (await axNodes()).some((node) => node.role?.value === 'option' && node.name?.value.includes('Release target')),
    )
    .toBe(true);
  await page.keyboard.press('Enter');
  await expect(host).toBeHidden();
  await expect
    .poll(() =>
      worker.evaluate(async () => (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]?.url),
    )
    .toBe('https://release.test/target');
  expect(await page.evaluate(() => document.body.inert)).toBe(false);
  await browserCdp.detach();
  await cdp.detach();
});
