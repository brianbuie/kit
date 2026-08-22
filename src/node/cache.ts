import { type Duration, isAfter, add } from 'date-fns';
import { type FileJson } from './file-json.ts';
import { Dir } from './dir.ts';

export type CacheOptions<T> = {
  path?: string;
  ttl?: number | Duration;
  key: string;
  data?: T;
};

/**
 * Save data to a local file with an expiration.
 * Fresh/stale data is returned with a flag for if it's fresh or not,
 * so stale data can still be used if needed.
 */
export class Cache<T> {
  file: FileJson<{ savedAt: string; data: T }>;
  ttl: Duration;

  constructor({ path, key, ttl, data }: CacheOptions<T>) {
    const dir = new Dir(path || '.cache', { temp: true });
    this.file = dir.file(key).json();
    this.ttl = typeof ttl === 'number' ? { minutes: ttl } : ttl || { minutes: 5 };
    if (data !== undefined) this.write(data);
  }

  write = (data: T) => {
    this.file.write({ savedAt: new Date().toUTCString(), data });
  };

  read = (): [T | undefined, boolean] => {
    const { savedAt, data } = this.file.read() || {};
    const isFresh = Boolean(savedAt && isAfter(add(savedAt, this.ttl), new Date()));
    return [data, isFresh];
  };
}
