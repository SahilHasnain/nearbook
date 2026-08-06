function createInMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null;
    },
    getItem(key: string): string | null {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value));
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    clear(): void {
      store.clear();
    },
  } as Storage;
}

export function installLocalStorage(): void {
  const storage = createInMemoryStorage();
  const globals: unknown[] = [globalThis];
  if (typeof global !== "undefined") globals.push(global);
  if (typeof window !== "undefined") globals.push(window);

  for (const target of globals) {
    if (target && typeof target === "object") {
      try {
        const obj = target as Record<string, unknown>;
        if (!obj.localStorage) obj.localStorage = storage;
      } catch {
        // ignore read-only globals
      }
    }
  }
}

installLocalStorage();
