import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Cache } from './cache.ts';
import { temp } from './dir.ts';

describe('Cache', () => {
  it('uses an explicitly provided directory', () => {
    const dir = temp.tempDir('cache-test');
    const cache = new Cache<string>({ key: 'value', ttl: 5, path: dir.path });

    cache.write('cached');

    assert.equal(cache.file.path, dir.filepath('value.json'));
    assert.deepEqual(cache.read(), ['cached', true]);
  });

  it('writes falsy initial data', () => {
    const dir = temp.tempDir('cache-initial-data-test');
    const cache = new Cache<number>({ key: 'count', data: 0, path: dir.path });

    assert.deepEqual(cache.read(), [0, true]);
  });

  it('returns stale cached data after its TTL expires', () => {
    const dir = temp.tempDir('cache-stale-test');
    const cache = new Cache<string>({ key: 'value', ttl: -1, path: dir.path });

    cache.write('cached');

    assert.deepEqual(cache.read(), ['cached', false]);
  });
});
