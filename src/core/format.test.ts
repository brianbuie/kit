import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Format } from './format.ts';

describe('Format', () => {
  it('date', () => {
    const date = new Date(2024, 0, 2, 3, 4, 5);

    assert.match(Format.date('iso', date), /^2024-01-02T03:04:05/);
    assert.equal(Format.date('ymd', date), '20240102');
    assert.equal(Format.date('ymd-hm', date), '20240102-0304');
    assert.equal(Format.date('ymd-hms', date), '20240102-030405');
    assert.equal(Format.date('h:m:s', date), '03:04:05');
    assert.equal(Format.date('MMM d, yyyy', date), 'Jan 2, 2024');
  });

  it('plural', () => {
    assert.equal(Format.plural(1, 'file'), '1 file');
    assert.equal(Format.plural(2, 'file'), '2 files');
    assert.equal(Format.plural(2, 'person', 'people'), '2 people');
  });

  it('round', () => {
    assert.equal(Format.round(1.22), '1');
    assert.equal(Format.round(1.55), '2');
    assert.equal(Format.round(1.823, 2), '1.82');
  });

  it('ms', () => {
    const SECOND = 1000;
    const MINUTE = 60 * SECOND;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;
    assert.equal(Format.ms(100), '100ms');
    assert.equal(Format.ms(5 * SECOND), '5s');
    assert.equal(Format.ms(75 * SECOND), '1m 15s');
    assert.equal(Format.ms(30 * MINUTE + 30 * SECOND), '30m 30s');
    assert.equal(Format.ms(2 * HOUR + 2 * MINUTE), '2h 2m');
    assert.equal(Format.ms(2 * DAY + 2 * HOUR), '2d 2h');
  });

  it('bytes', () => {
    const base = 1024;
    assert.equal(Format.bytes(2), '2 b');
    assert.equal(Format.bytes(base), '1 KB');
    assert.equal(Format.bytes(base + 0.1 * base), '1.1 KB');
    assert.equal(Format.bytes(base + 0.25 * base), '1.25 KB');
    assert.equal(Format.bytes(base ** 2), '1 MB');
    assert.equal(Format.bytes(base ** 3), '1 GB');
    assert.equal(Format.bytes(base ** 4), '1 TB');
    assert.equal(Format.bytes(base ** 5), '1,024 TB');
  });
});
