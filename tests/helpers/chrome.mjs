// API boundary fake, not a Chrome emulator. Clone storage like Chrome does;
// fail on unimplemented calls rather than silently returning success.
export const event = () => {
  const listeners = new Set();
  return {
    listeners,
    addListener: (listener) => listeners.add(listener),
    removeListener: (listener) => listeners.delete(listener),
    emit: (...args) => [...listeners].map((listener) => listener(...args)),
  };
};

export const storage = (data = {}) => ({
  data,
  async get(keys) {
    return structuredClone(Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map((key) => [key, data[key]])));
  },
  async set(values) {
    Object.assign(data, structuredClone(values));
  },
  async remove(keys) {
    for (const key of [keys].flat()) delete data[key];
  },
});

export const makeChrome = () => {
  const tabs = [
    { id: 1, windowId: 10, index: 0, active: true, title: 'Source', url: 'https://source.test/' },
    { id: 2, windowId: 20, index: 0, active: false, title: 'Target', url: 'https://target.test/' },
    { id: 3, windowId: 10, index: 1, active: false, title: 'Right', url: 'https://right.test/' },
  ];
  const chrome = {
    runtime: {
      id: 'test-extension',
      getURL: (path) => `chrome-extension://test-extension/${path}`,
      onMessage: event(),
      onInstalled: event(),
      onStartup: event(),
      async sendMessage(message) {
        return new Promise((resolve, reject) => {
          const [listener] = chrome.runtime.onMessage.listeners;
          if (!listener) return reject(new Error('No receiving end'));
          if (listener(message, { id: chrome.runtime.id }, resolve) !== true)
            reject(new Error('Response channel closed'));
        });
      },
    },
    storage: { local: storage(), session: storage(), onChanged: event() },
    tabs: {
      ...Object.fromEntries(
        ['onActivated', 'onCreated', 'onMoved', 'onAttached', 'onDetached', 'onRemoved', 'onUpdated'].map((key) => [
          key,
          event(),
        ]),
      ),
      async query(filter) {
        return structuredClone(
          tabs.filter((tab) => Object.entries(filter).every(([key, value]) => tab[key] === value)),
        );
      },
      async get(id) {
        const tab = tabs.find((tab) => tab.id === id);
        if (!tab) throw new Error(`No tab with id: ${id}`);
        return structuredClone(tab);
      },
      async update(id, values) {
        await chrome.tabs.get(id);
        Object.assign(
          tabs.find((tab) => tab.id === id),
          values,
        );
      },
      async remove(ids) {
        for (const id of [ids].flat()) {
          await chrome.tabs.get(id);
          tabs.splice(
            tabs.findIndex((tab) => tab.id === id),
            1,
          );
        }
      },
      async sendMessage() {
        throw new Error('No receiving end');
      },
    },
    windows: {
      WINDOW_ID_NONE: -1,
      onRemoved: event(),
      async getAll() {
        return [{ id: 10 }, { id: 20 }];
      },
      async getLastFocused() {
        return { id: 10 };
      },
      async update() {},
    },
    action: { onClicked: event(), async setPopup() {} },
    commands: { onCommand: event() },
    permissions: {
      onAdded: event(),
      onRemoved: event(),
      async contains() {
        return false;
      },
      async getAll() {
        return { permissions: [] };
      },
    },
  };
  return { chrome, tabs };
};
