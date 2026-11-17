import { describe, it, assert } from 'vitest';
import { temp } from './dir.ts';
import { File } from './file.ts';
import { FileJson } from './file-json.ts';
import { JsonDb } from './json-db.ts';

type Item = {
  id: string | number;
  name: string;
  profile: { city: string; zip?: string };
  tags: string[];
};

const testDir = temp.tempDir('json-db-test');

const item = (id: Item['id'], name = `item-${id}`): Item => ({
  id,
  name,
  profile: { city: 'Springfield' },
  tags: [],
});

describe('JsonDb', () => {
  it('starts empty when the backing file does not exist', () => {
    const db = new JsonDb<Item>(testDir.filepath('empty-db'));

    assert.deepEqual(db.items, []);
    assert.deepEqual(db.ids, new Set());
    assert.equal(db.file.exists, false);
  });

  it('accepts a path, File, or FileJson as its backing store', () => {
    const pathDb = new JsonDb<Item>(testDir.filepath('path-db'));
    const fileDb = new JsonDb<Item>(testDir.file('file-db'));
    const jsonFile = new FileJson<Item[]>(testDir.filepath('json-file-db'));
    const jsonFileDb = new JsonDb<Item>(jsonFile);

    pathDb.insert(item('path'));
    fileDb.insert(item('file'));
    jsonFileDb.insert(item('json-file'));

    assert.deepEqual(
      pathDb.items.map(value => value.id),
      ['path'],
    );
    assert.deepEqual(
      fileDb.items.map(value => value.id),
      ['file'],
    );
    assert.deepEqual(
      jsonFileDb.items.map(value => value.id),
      ['json-file'],
    );
  });

  it('inserts items and rejects duplicate IDs', () => {
    const db = new JsonDb<Item>(testDir.filepath('insert-db'));
    const first = item(1);

    db.insert(first);

    assert.deepEqual(db.items, [first]);
    assert.throws(() => db.insert(item(1, 'duplicate')), 'Item with id 1 already exists');
  });

  it('lists IDs and looks up items by ID', () => {
    const db = new JsonDb<Item>(testDir.filepath('lookup-db'));
    const stringIdItem = item('1');
    const numberIdItem = item(1);

    db.insertMany([stringIdItem, numberIdItem]);

    assert.deepEqual(db.ids, new Set(['1', 1]));
    assert.deepEqual(db.item('1'), stringIdItem);
    assert.deepEqual(db.item(1), numberIdItem);
    assert.equal(db.item('missing'), undefined);
  });

  it('inserts many items while skipping IDs that already exist', () => {
    const db = new JsonDb<Item>(testDir.filepath('insert-many-db'));
    const existing = item('existing');
    const added = item('added');
    db.insert(existing);

    db.insertMany([item('existing', 'duplicate'), added]);

    assert.deepEqual(db.items, [existing, added]);
  });

  it('merges updates, replacing arrays, and rejects missing IDs', () => {
    const db = new JsonDb<Item>(testDir.filepath('update-db'));
    const existing = { ...item(1), profile: { city: 'Oldtown', zip: '12345' }, tags: ['old'] };
    db.insert(existing);
    const update: Item = { id: 1, name: 'updated', profile: { city: 'Newtown' }, tags: ['new'] };

    db.update(update);

    assert.deepEqual(db.item(1), {
      id: 1,
      name: 'updated',
      profile: { city: 'Newtown', zip: '12345' },
      tags: ['new'],
    });
    assert.throws(() => db.update(item(2)), 'Item with id 2 does not exist');
  });

  it('upserts by inserting missing IDs and updating existing ones', () => {
    const db = new JsonDb<Item>(testDir.filepath('upsert-db'));

    db.upsert(item('new'));
    db.upsert(item('new', 'updated'));

    assert.equal(db.items.length, 1);
    assert.equal(db.item('new')?.name, 'updated');
  });

  it('replaces an existing item and inserts an item with a missing ID', () => {
    const db = new JsonDb<Item>(testDir.filepath('replace-db'));
    db.insert({ ...item(1), profile: { city: 'Oldtown', zip: '12345' }, tags: ['old'] });
    const replacement: Item = { id: 1, name: 'replacement', profile: { city: 'Newtown' }, tags: ['new'] };

    db.replace(replacement);
    db.replace(item(2));

    assert.deepEqual(db.items, [replacement, item(2)]);
  });

  it('deletes items by ID and does nothing when the ID is missing', () => {
    const db = new JsonDb<Item>(testDir.filepath('delete-db'));
    db.insertMany([item(1), item(2)]);

    db.delete(1);
    db.delete(3);

    assert.deepEqual(db.items, [item(2)]);
  });
});
