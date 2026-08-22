import { describe, it } from 'node:test';
import assert from 'node:assert';
import { snapshot } from './snapshot.ts';
import { temp } from '../node/dir.ts';

const testDir = temp.tempDir('snapshot');
testDir.clear();

describe('snapshot', () => {
  it('Captures Error details', () => {
    try {
      throw new Error('Test Error');
    } catch (e) {
      const result = snapshot(e) as Error;
      assert(result.message !== undefined);
      assert(result.stack !== undefined);
    }
  });

  it('Captures Map values', () => {
    const test = new Map<string, string>();
    test.set('key', 'value');
    const shot = JSON.parse(JSON.stringify(snapshot(test))) as Record<string, string>;
    assert(shot.key === 'value');
  });

  it('Captures Request values', () => {
    const test = new Request('https://www.google.com', { headers: { example: 'value' } });
    const shot = JSON.parse(JSON.stringify(snapshot(test))) as Record<string, any>;
    assert(shot.url !== undefined);
    assert(shot.headers.example === 'value');
  });

  it('Ignores functions', () => {
    const test = { func: () => null };
    const shot = snapshot(test) as Record<string, any>;
    assert(shot.func === undefined);
  });

  it('Handles recursive references', () => {
    type Thing = { id: number; thing?: Thing; things: Thing[] };
    function createThing(id: number, thing?: Thing) {
      const newThing: Thing = { id, thing, things: [] };
      if (thing) {
        thing.things.push(newThing);
      }
      return newThing;
    }
    const t1 = createThing(1);
    const t2 = createThing(2, t1);
    const result = snapshot(t1, 20) as Thing;
    const f1 = testDir.file('recursive').json(result);
    const parsed = f1.read();
    const f2 = testDir.file('recursive2').json(parsed);
    assert.deepEqual(f1.read(), f2.read());
  });
});
