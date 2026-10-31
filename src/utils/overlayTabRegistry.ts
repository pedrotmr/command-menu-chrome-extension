interface OverlayTabRegistryPort {
  load: () => Promise<unknown>;
  save: (tabIds: number[]) => Promise<void>;
  notify: (tabId: number, message?: unknown) => Promise<unknown>;
}

export class OverlayTabRegistry {
  private tabIds = new Set<number>();
  private restored: Promise<void> | null = null;
  private writes: Promise<void> = Promise.resolve();

  constructor(private readonly port: OverlayTabRegistryPort) {}

  register(tabId: number): Promise<void> {
    return this.update(tabId, true);
  }

  unregister(tabId: number): Promise<void> {
    return this.update(tabId, false);
  }

  async broadcast(message: unknown = { action: 'ui:tabs-changed' }): Promise<void> {
    await this.restore();
    await this.writes.catch(() => undefined);
    await Promise.all(
      [...this.tabIds].map(async (tabId) => {
        try {
          await this.port.notify(tabId, message);
        } catch {
          await this.unregister(tabId).catch(() => undefined);
        }
      }),
    );
  }

  private update(tabId: number, shouldRegister: boolean): Promise<void> {
    const write = this.writes
      .catch(() => undefined)
      .then(async () => {
        await this.restore();
        if (shouldRegister) this.tabIds.add(tabId);
        else this.tabIds.delete(tabId);
        await this.port.save([...this.tabIds]);
      });
    this.writes = write.then(
      () => undefined,
      () => undefined,
    );
    return write;
  }

  private restore(): Promise<void> {
    if (!this.restored) {
      this.restored = this.port
        .load()
        .then((savedTabIds) => {
          if (!Array.isArray(savedTabIds)) return;
          this.tabIds = new Set(savedTabIds.filter((tabId): tabId is number => Number.isInteger(tabId) && tabId >= 0));
        })
        .catch(() => undefined);
    }
    return this.restored;
  }
}
