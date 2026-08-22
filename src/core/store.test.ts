import { describe, it, beforeEach, assert } from 'vitest';
import { MemStore, Store } from './store.ts';

describe('MemStore', () => {
  it('implements the Storage contract', () => {
    const store = new MemStore();
    store.setItem('first', '1');
    store.setItem('second', '2');

    assert.equal(store.length, 2);
    assert.equal(store.getItem('first'), '1');
    assert.equal(store.key(0), 'first');
    assert.equal(store.key(2), null);
    store.removeItem('first');
    assert.equal(store.getItem('first'), null);
    store.clear();
    assert.equal(store.length, 0);
  });
});

describe('Store', () => {
  beforeEach(() => Store.clear());

  it('stores string values and reports native Storage metadata', () => {
    Store.setItem('number', 42 as unknown as string);
    Store.setItem('text', 'value');

    assert.equal(Store.length, 2);
    assert.equal(Store.getItem('number'), '42');
    assert.equal(Store.key(1), 'text');
  });

  it('removes and clears values', () => {
    Store.setItem('key', 'value');
    Store.removeItem('key');
    assert.equal(Store.getItem('key'), null);
    assert.equal(Store.length, 0);

    Store.setItem('another', 'value');
    Store.clear();
    assert.equal(Store.length, 0);
  });
});
