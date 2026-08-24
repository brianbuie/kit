import { Env } from './env.ts';

export class MemStore implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] !== undefined ? keys[index] : null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

/**
 * A global key value store that uses localStorage in browser or process memory on the server.
 * Uses static methods in the same shape as native `Storage`, string values only.
 * @example
 * Store.setItem('key', 'value');
 * const result = Store.getItem('key'); // 'value'
 */
export class Store {
  protected static store: Storage = Env.window?.localStorage || new MemStore();

  static get length(): number {
    return this.store.length;
  }

  static clear(): void {
    this.store.clear();
  }

  static getItem(key: string): string | null {
    return this.store.getItem(key);
  }

  static key(index: number): string | null {
    return this.store.key(index);
  }

  static removeItem(key: string): void {
    this.store.removeItem(key);
  }

  static setItem(key: string, value: string): void {
    this.store.setItem(key, String(value));
  }
}
