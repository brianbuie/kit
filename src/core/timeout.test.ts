import { describe, it } from 'node:test';
import assert from 'node:assert';
import { timeout } from './timeout.ts';

describe('timeout', () => {
  it('Waits correct amount of time', async () => {
    const start = Date.now();
    await timeout(500);
    assert(Date.now() - start >= 500);
  });
});
