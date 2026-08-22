import { add, isAfter, type Duration } from 'date-fns';
import { Store } from './store.ts';

export type CacheOptions<T> = {
  key: string;
  ttl?: number | Duration;
  data?: T;
};

export type CacheEntry<T> = {
  savedAt: string;
  data: T;
};

/**
 * Save data with an expiration, to local storage (in browser) or in memory.
 * Data is returned with a flag for freshness, so stale data can still be used if needed.
 * @example
 * const ex1 = new Cache({ key: 'ex1', ttl: 1, data: 'foo' }); // in memory cache, expires in 1 minute
 * const [ex1Data, isFresh] = ex1.read(); // ['foo', true]
 * const ex2 = new Cache({ key: 'ex2' }); // 5 minute ttl by default
 * const [ex2Data, isFresh] = ex2.read() // [undefined, false]
 */
export class Cache<T> {
  key: string;
  ttl: Duration;

  constructor({ key, ttl = { minutes: 5 }, data }: CacheOptions<T>) {
    this.key = key;
    this.ttl = typeof ttl === 'number' ? { minutes: ttl } : ttl;
    if (data !== undefined) this.write(data);
  }

  protected get entry(): CacheEntry<T> | undefined {
    const raw = Store.getItem(this.key);
    return raw ? JSON.parse(raw) : undefined;
  }

  read = (): [T | undefined, boolean] => {
    const { savedAt, data } = this.entry || {};
    const isFresh = Boolean(savedAt && isAfter(add(savedAt, this.ttl), new Date()));
    return [data, isFresh];
  };

  protected set entry(newEntry: CacheEntry<T>) {
    Store.setItem(this.key, JSON.stringify(newEntry));
  }

  write = (data: T): void => {
    this.entry = { savedAt: new Date().toUTCString(), data };
  };
}
