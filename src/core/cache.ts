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

export type CacheStorage<T> = {
  read: () => CacheEntry<T> | undefined;
  write: (entry: CacheEntry<T>) => void;
};

/**
 * Save data with an expiration, to local storage (in browser) or in memory.
 * Data is returned with a flag for freshness, so stale data can still be used if needed.
 * A custom `storage` can be provided (eg. to save to a file), overriding the default local storage / in memory behavior.
 * @example
 * const ex1 = new Cache({ key: 'ex1', ttl: 1, data: 'foo' }); // in memory cache, expires in 1 minute
 * const [ex1Data, isFresh] = ex1.read(); // ['foo', true]
 * const ex2 = new Cache({ key: 'ex2' }); // 5 minute ttl by default
 * const [ex2Data, isFresh] = ex2.read() // [undefined, false]
 */
export class Cache<T> {
  key: string;
  ttl: Duration;
  protected storage: CacheStorage<T>;

  constructor({ key, ttl = { minutes: 5 }, data }: CacheOptions<T>, storage?: CacheStorage<T>) {
    this.key = key;
    this.ttl = typeof ttl === 'number' ? { minutes: ttl } : ttl;
    this.storage = storage || {
      read: () => {
        const raw = Store.getItem(this.key);
        return raw ? JSON.parse(raw) : undefined;
      },
      write: entry => Store.setItem(this.key, JSON.stringify(entry)),
    };
    if (data !== undefined) this.write(data);
  }

  read = (): [T | undefined, boolean] => {
    const { savedAt, data } = this.storage.read() || {};
    const isFresh = Boolean(savedAt && isAfter(add(savedAt, this.ttl), new Date()));
    return [data, isFresh];
  };

  write = (data: T): void => {
    this.storage.write({ savedAt: new Date().toUTCString(), data });
  };
}
