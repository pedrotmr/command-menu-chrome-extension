const $ = (selector) => document.querySelector(selector);
const connectButton = $('#connect');
const disconnectButton = $('#disconnect');
const sampleButton = $('#sample');
const organizeButton = $('#organize');
const cancelButton = $('#cancel');
const applyButton = $('#apply');
const connectionLabel = $('#connection');
const results = $('#results');
const groupsRoot = $('#groups');
const duplicatesRoot = $('#duplicates');
const message = $('#message');
let proposal;
let analysisCancelled = false;

connectButton.addEventListener('click', () =>
  run(connectButton, async () => {
    connectionLabel.textContent = 'Complete the sign-in and permission flow in your browser…';
    const session = await send({ type: 'connect' });
    renderSession(session);
  }),
);

disconnectButton.addEventListener('click', () =>
  run(disconnectButton, async () => {
    const session = await send({ type: 'disconnect' });
    renderSession(session);
  }),
);

sampleButton.addEventListener('click', () =>
  run(sampleButton, async () => {
    const result = await send({ type: 'load-sample' });
    showMessage(
      result.alreadyLoaded
        ? 'Sample tabs are already open in this window.'
        : `Opened ${result.opened} local sample tabs.`,
      false,
    );
  }),
);

organizeButton.addEventListener('click', async () => {
  analysisCancelled = false;
  clearMessage();
  organizeButton.disabled = true;
  organizeButton.textContent = 'Analyzing…';
  cancelButton.classList.remove('hidden');
  results.classList.add('hidden');
  try {
    const result = await send({ type: 'analyze' });
    if (analysisCancelled) return;
    proposal = result;
    renderProposal(proposal);
  } catch (error) {
    showMessage(analysisCancelled ? 'Analysis cancelled. No tabs were changed.' : error.message, !analysisCancelled);
  } finally {
    organizeButton.disabled = false;
    organizeButton.textContent = 'Organize tabs';
    cancelButton.classList.add('hidden');
  }
});

cancelButton.addEventListener('click', () => {
  analysisCancelled = true;
  void send({ type: 'cancel-analysis' });
  showMessage('Analysis cancelled. No tabs were changed.', false);
});

applyButton.addEventListener('click', () =>
  run(applyButton, async () => {
    const selectedByGroup = new Map();
    for (const input of groupsRoot.querySelectorAll('input[data-group-index]:checked')) {
      const groupIndex = Number(input.dataset.groupIndex);
      const group = proposal.groups[groupIndex];
      if (!group) continue;
      const selected = selectedByGroup.get(groupIndex) || { name: group.name, tabs: [] };
      const tab = group.tabs.find((candidate) => candidate.id === Number(input.dataset.tabId));
      if (tab) selected.tabs.push(tab);
      selectedByGroup.set(groupIndex, selected);
    }
    const selectedGroups = [...selectedByGroup.values()];
    const selectedCloseIds = [...duplicatesRoot.querySelectorAll('input[data-close-index]:checked')]
      .map((input) => proposal.closeCandidates[Number(input.dataset.closeIndex)])
      .filter((candidate) => candidate && !candidate.pinned);
    const result = await send({ type: 'apply', selection: { groups: selectedGroups, closeIds: selectedCloseIds } });
    results.classList.add('hidden');
    const skipped = result.skipped.length ? ` Skipped ${result.skipped.length} changed or unavailable item(s).` : '';
    showMessage(
      `Applied ${result.appliedGroups.length} group(s), closed ${result.closedCount} tab(s).${skipped}`,
      false,
    );
    if (result.closedCount) $('#reopen').classList.remove('hidden');
  }),
);

$('#reopen').addEventListener('click', () =>
  run($('#reopen'), async () => {
    const result = await send({ type: 'reopen' });
    $('#reopen').classList.toggle('hidden', !result.hasMore);
    const failed = result.failed.length ? ` Could not reopen ${result.failed.length} tab(s); try again.` : '';
    showMessage(`Reopened ${result.reopened.length} tab URL(s). Unsaved page state is not restored.${failed}`, false);
  }),
);

async function send(payload) {
  const response = await chrome.runtime.sendMessage(payload);
  if (!response?.ok) throw new Error(response?.error || 'The prototype could not complete that action.');
  return response.result;
}

async function run(button, callback) {
  button.disabled = true;
  clearMessage();
  try {
    await callback();
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    button.disabled = false;
  }
}

function renderSession(session) {
  const signedIn = session?.sharing === true;
  const hasSavedSession = session?.status === 'connected' || session?.status === 'reauth_required';
  connectButton.classList.toggle('hidden', signedIn);
  disconnectButton.classList.toggle('hidden', !hasSavedSession);
  $('#usage').classList.toggle('hidden', !signedIn);
  connectionLabel.textContent = signedIn
    ? `Connected to ChatGPT${session.identity?.email ? ` as ${session.identity.email}` : ''}; plan usage is enabled.`
    : session?.status === 'connected'
      ? 'Signed in, but ChatGPT plan usage is not enabled for this connection. Reconnect and grant plan usage.'
      : 'Not connected. Connect an eligible ChatGPT account to analyze tabs.';
  connectionLabel.dataset.error = String(session?.status === 'reauth_required');
}

function renderProposal(value) {
  results.classList.remove('hidden');
  const effort = value.reasoningEffort ? ` · ${value.reasoningEffort}` : '';
  $('#latency').textContent = `${Math.round(value.latencyMs)} ms · ${value.modelName || 'ChatGPT'}${effort}`;
  $('#notice').textContent =
    `${value.tabsAnalyzed} tabs analyzed. Grouping is selected; closures need your explicit selection.`;
  const summary = document.createElement('p');
  summary.className = 'notice';
  summary.textContent = value.summary;
  groupsRoot.replaceChildren(summary);
  duplicatesRoot.replaceChildren();

  for (const [index, group] of value.groups.entries()) {
    const card = document.createElement('article');
    card.className = 'card';
    const heading = document.createElement('h3');
    heading.textContent = group.name;
    card.append(heading);
    const reason = document.createElement('p');
    reason.className = 'notice';
    reason.textContent = group.reason;
    card.append(reason);
    for (const tab of group.tabs) {
      const input = checkbox(`group-${index}-${tab.id}`, tab.title, `group ${index}`);
      input.checked = true;
      input.dataset.groupIndex = String(index);
      input.dataset.tabId = String(tab.id);
      const details = document.createElement('small');
      details.textContent = tab.url;
      input.parentElement.querySelector('span').append(details);
      if (tab.pinned) input.parentElement.querySelector('span').append(badge('pinned'));
      card.append(input.parentElement);
    }
    groupsRoot.append(card);
  }

  if (!value.closeCandidates.length) return;
  const section = document.createElement('article');
  section.className = 'card';
  const heading = document.createElement('h3');
  heading.textContent = 'Possible duplicates';
  section.append(heading);
  for (const [index, candidate] of value.closeCandidates.entries()) {
    const input = checkbox(`close-${index}`, candidate.title, `close ${index}`);
    input.dataset.closeIndex = String(index);
    input.checked = false;
    input.disabled = candidate.pinned;
    const reason = document.createElement('small');
    reason.textContent = `${candidate.reason} · ${candidate.url}`;
    input.parentElement.querySelector('span').append(reason);
    if (candidate.pinned) input.parentElement.querySelector('span').append(badge('pinned · protected'));
    section.append(input.parentElement);
  }
  duplicatesRoot.append(section);
}

function checkbox(id, label, data) {
  const wrapper = document.createElement('label');
  wrapper.className = 'option';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = id;
  input.dataset[data.startsWith('group') ? 'groupIndex' : 'closeIndex'] = data.split(' ')[1];
  const text = document.createElement('span');
  text.append(document.createTextNode(label));
  wrapper.append(input, text);
  return input;
}

function badge(label) {
  const span = document.createElement('span');
  span.className = 'badge';
  span.textContent = label;
  return span;
}

function showMessage(text, isError) {
  message.textContent = text;
  message.dataset.error = String(isError);
}

function clearMessage() {
  message.textContent = '';
  message.removeAttribute('data-error');
}

void send({ type: 'session' }).then(renderSession, (error) => {
  connectionLabel.textContent = error.message;
  connectionLabel.dataset.error = 'true';
});

void send({ type: 'has-reopenable-tabs' }).then((hasTabs) => {
  $('#reopen').classList.toggle('hidden', !hasTabs);
});
