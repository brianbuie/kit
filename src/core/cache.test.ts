import { describe, it, beforeEach, assert } from 'vitest';
import { Cache } from './cache.ts';
import { Store } from './store.ts';

describe('Cache', () => {
  beforeEach(() => Store.clear());

  it('writes and reads data from the shared store', () => {
    const cache = new Cache<string>({ key: 'value', ttl: 5, data: 'cached' });

    assert.deepEqual(cache.read(), ['cached', true]);
    assert.equal(Store.length, 1);
  });

  it('writes falsy values', () => {
    const number = new Cache<number>({ key: 'number', data: 0 });
    const boolean = new Cache<boolean>({ key: 'boolean', data: false });
    const text = new Cache<string>({ key: 'text', data: '' });

    assert.deepEqual(number.read(), [0, true]);
    assert.deepEqual(boolean.read(), [false, true]);
    assert.deepEqual(text.read(), ['', true]);
  });

  it('returns stale data after its TTL expires', () => {
    const cache = new Cache<string>({ key: 'value', ttl: -1, data: 'cached' });

    assert.deepEqual(cache.read(), ['cached', false]);
  });

  it('returns no data for a missing key', () => {
    const cache = new Cache<string>({ key: 'missing' });

    assert.deepEqual(cache.read(), [undefined, false]);
  });

  it('accepts a date-fns duration', () => {
    const cache = new Cache<string>({ key: 'value', ttl: { seconds: -1 }, data: 'cached' });

    assert.deepEqual(cache.read(), ['cached', false]);
  });
});
