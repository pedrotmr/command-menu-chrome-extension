export class SerialTaskQueue {
  private tail: Promise<void> = Promise.resolve();

  enqueue<T>(operation: () => Promise<T> | T): Promise<T> {
    const result = this.tail.catch(() => undefined).then(operation);
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );

    return result;
  }

  drain(): Promise<void> {
    return this.tail.catch(() => undefined);
  }
}
