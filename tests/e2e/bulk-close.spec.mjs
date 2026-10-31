import { test, expect } from './fixtures.mjs';

test('bulk-close dialog rejects changed tabs, then closes only freshly confirmed targets', async ({ extension }) => {
  const { context, id, worker } = extension;
  await context.route('https://close.test/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>Close fixture</title>' }),
  );
  const anchor = await context.newPage();
  await anchor.goto('https://close.test/anchor');
  const right = await context.newPage();
  await right.goto('https://close.test/right');
  await anchor.bringToFront();
  const cdp = await context.newCDPSession(anchor);
  const root = await context.browser().newBrowserCDPSession();
  const { targetInfos } = await root.send('Target.getTargets', { filter: [{ type: 'tab', exclude: false }] });
  const tab = targetInfos.find((target) => target.url === anchor.url());
  await root.send('Extensions.triggerAction', { id, targetId: tab.targetId });
  const nodes = async () => (await cdp.send('Accessibility.getFullAXTree')).nodes;
  await expect
    .poll(async () => (await nodes()).some((node) => node.role?.value === 'combobox' && !node.ignored))
    .toBe(true);
  await anchor.keyboard.type('Close tabs to the right');
  await expect
    .poll(async () =>
      (await nodes()).some(
        (node) => node.role?.value === 'option' && node.name?.value.includes('Close tabs to the right'),
      ),
    )
    .toBe(true);
  await anchor.keyboard.press('Enter');
  await expect
    .poll(async () =>
      (await nodes()).some((node) => node.role?.value === 'dialog' && node.name?.value.includes('Close')),
    )
    .toBe(true);
  const late = await context.newPage();
  await late.goto('https://close.test/late');
  await anchor.bringToFront();
  const confirm = async () => {
    await expect
      .poll(async () =>
        (await nodes()).some((node) => node.role?.value === 'button' && /^Close /.test(node.name?.value ?? '')),
      )
      .toBe(true);
    const button = (await nodes()).find(
      (node) => node.role?.value === 'button' && /^Close /.test(node.name?.value ?? ''),
    );
    expect(button).toBeDefined();
    await cdp.send('DOM.focus', { backendNodeId: button.backendDOMNodeId });
    await anchor.keyboard.press('Enter');
  };
  await confirm();
  await expect.poll(async () => (await nodes()).some((node) => node.name?.value.includes('Tabs changed.'))).toBe(true);
  expect(right.isClosed()).toBe(false);
  expect(late.isClosed()).toBe(false);
  await anchor.keyboard.press('Escape');
  await expect
    .poll(async () => (await nodes()).some((node) => node.role?.value === 'button' && node.name?.value === 'Cancel'))
    .toBe(false);
  // Re-run the command against the refreshed list after rejecting the stale confirmation.
  await anchor.keyboard.press('ControlOrMeta+A');
  await anchor.keyboard.type('Close tabs to the right');
  await expect
    .poll(async () =>
      (await nodes()).some(
        (node) => node.role?.value === 'combobox' && node.value?.value === 'Close tabs to the right',
      ),
    )
    .toBe(true);
  await anchor.keyboard.press('Enter');
  await expect
    .poll(async () => (await nodes()).filter((node) => node.role?.value === 'dialog').map((node) => node.name?.value))
    .toContain('Close 2 tabs to the right?');
  await confirm();
  await expect.poll(() => right.isClosed() && late.isClosed()).toBe(true);
  expect(anchor.isClosed()).toBe(false);
  const remaining = await worker.evaluate(() => chrome.tabs.query({}));
  expect(remaining.some((tab) => tab.url === 'https://close.test/anchor')).toBe(true);
  await root.detach();
  await cdp.detach();
});
