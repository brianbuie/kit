import { Cache as CacheCore, type CacheOptions as CacheCoreOptions, type CacheEntry } from '../core/cache.ts';
import { type FileJson } from './file-json.ts';
import { Dir } from './dir.ts';

export type CacheOptions<T> = CacheCoreOptions<T> & {
  dir?: string | Dir;
};

/**
 * Save data with an expiration, to a file or in memory.
 * Data is returned with a flag for freshness, so stale data can still be used if needed.
 * @example
 * const ex1 = new Cache({ key: 'ex1', ttl: 1, data: 'foo' }); // in memory, expires in 1 minute
 * const [ex1Data, isFresh] = ex1.read(); // ['foo', true]
 * const ex2 = new Cache({ key: 'ex2', dir: '.cache' }); // file at './.cache/ex2.json', 5 minute ttl by default
 * const [ex2Data, isFresh] = ex2.read() // [undefined, false]
 */
export class Cache<T> extends CacheCore<T> {
  file?: FileJson<CacheEntry<T>>;

  constructor({ dir, key, ttl, data }: CacheOptions<T>) {
    let file: FileJson<CacheEntry<T>> | undefined;
    if (dir) {
      const cacheDir = dir instanceof Dir ? dir : new Dir(dir, { temp: true });
      if (!cacheDir.isTemp) throw new Error('Cache directory must be temporary');
      file = cacheDir.file(key).json();
    }
    super(
      { key, ttl, data },
      file && {
        read: () => file!.read(),
        write: entry => file!.write(entry),
      },
    );
    this.file = file;
  }
}
