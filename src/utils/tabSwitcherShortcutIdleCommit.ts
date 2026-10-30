export const TAB_SWITCHER_SHORTCUT_IDLE_MS = 260;

type TimerHandle = ReturnType<typeof globalThis.setTimeout>;
type ScheduleTimer = (callback: () => void, delayMs: number) => TimerHandle;
type CancelTimer = (handle: TimerHandle) => void;

export class TabSwitcherShortcutIdleCommit {
  private timer: TimerHandle | null = null;
  private manuallyCancelled = false;
  private disposed = false;

  constructor(
    private readonly commit: () => void,
    private readonly delayMs = TAB_SWITCHER_SHORTCUT_IDLE_MS,
    private readonly scheduleTimer: ScheduleTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
    private readonly cancelTimer: CancelTimer = (handle) => globalThis.clearTimeout(handle),
  ) {}

  scheduleAfterShortcut(): void {
    if (this.disposed) return;

    this.manuallyCancelled = false;
    this.clearTimer();
    this.timer = this.scheduleTimer(() => {
      this.timer = null;
      if (!this.disposed && !this.manuallyCancelled) this.commit();
    }, this.delayMs);
  }

  cancel(): void {
    this.clearTimer();
  }

  cancelForManualInteraction(): void {
    this.manuallyCancelled = true;
    this.clearTimer();
  }

  dispose(): void {
    this.disposed = true;
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.timer === null) return;
    this.cancelTimer(this.timer);
    this.timer = null;
  }
}
