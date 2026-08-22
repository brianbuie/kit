import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';

class BrowserStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, String(value));
  }
}

describe('browser helpers', () => {
  let storage: BrowserStorage;

  beforeEach(() => {
    storage = new BrowserStorage();
    vi.stubGlobal('window', { localStorage: storage });
    vi.resetModules();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('uses window.localStorage for Store', async () => {
    const { Store } = await import('./store.ts');

    Store.setItem('key', 'value');

    expect(Store.getItem('key')).toBe('value');
    expect(Store.length).toBe(1);
    expect(storage.getItem('key')).toBe('value');
  });

  it('detects the browser environment', async () => {
    const { Env } = await import('./env.ts');

    expect(Env.isBrowser).toBe(true);
    expect(Env.window).toBe(window);
  });
});
