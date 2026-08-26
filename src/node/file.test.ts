import { describe, it, assert } from 'vitest';
import { temp } from './dir.ts';
import { File, FileJson } from './file.ts';

const testDir = temp.tempDir('file-test');
testDir.clear();

const thing = {
  a: 'string',
  b: 2,
  c: true,
  d: false,
  e: null,
};

describe('File', () => {
  it('Handles request body as stream input', async () => {
    const img = testDir.file('image.jpg');
    await fetch('https://testingbot.com/free-online-tools/random-avatar/300').then(res => {
      if (!res.body) throw new Error('No response body');
      return img.writeStream(res.body);
    });
    assert(img.exists);
  });

  it('Sets correct content type from .ext', () => {
    assert.equal(new File('test1').type, undefined);
    assert.equal(new File('test2.json').type, 'application/json');
    assert.equal(new File('test3.jpg').type, 'image/jpeg');
  });
});

describe('FileType', () => {
  it('Creates instances', () => {
    const base = 'test2';
    const eg1 = new File.json(testDir.filepath(base));
    const eg2 = testDir.file(base).json();
    const eg3File = new File(testDir.filepath(base));
    const eg3 = eg3File.json();
    assert(eg1.path === eg2.path && eg2.path === eg3.path);
  });

  it('Deletes files', () => {
    const test = testDir.file('delete-test.txt');
    test.writeText('test');
    assert.equal(test.readText(), 'test');
    test.delete();
    assert.equal(test.exists, false);
  });

  it('Deletes files that do not exist without throwing', () => {
    const test = testDir.file('does-not-exist.txt');
    assert.equal(test.exists, false);
    assert.doesNotThrow(() => test.delete());
  });

  it('Moves files to trash', async () => {
    const test = testDir.file('trash-test.txt');
    test.writeText('test');
    await test.trash();
    assert.equal(test.exists, false);
  });

  it('Does nothing when trashing a file that does not exist', async () => {
    const test = testDir.file('trash-missing.txt');
    assert.equal(test.exists, false);
    await test.trash();
  });

  it('Copies files to another directory', () => {
    const source = testDir.file('copy-source.txt');
    source.writeText('test');
    const destDir = testDir.tempDir('copy-dest');
    const copy = source.copyTo(destDir.path);
    assert.equal(source.exists, true);
    assert.equal(copy.exists, true);
    assert.equal(copy.readText(), 'test');
    assert.equal(copy.dir, destDir.path);
  });

  it('Returns a new File instance without copying when the source does not exist', () => {
    const source = testDir.file('copy-missing.txt');
    const destDir = testDir.tempDir('copy-dest-missing');
    const copy = source.copyTo(destDir.path);
    assert.equal(copy.exists, false);
  });

  it('Accepts a Dir instance as the destination for copyTo and moveTo', () => {
    const copySource = testDir.file('copy-source-dir.txt');
    copySource.writeText('test');
    const copyDestDir = testDir.tempDir('copy-dest-dir');
    const copy = copySource.copyTo(copyDestDir);
    assert.equal(copy.exists, true);
    assert.equal(copy.dir, copyDestDir.path);

    const moveSource = testDir.file('move-source-dir.txt');
    moveSource.writeText('test');
    const moveDestDir = testDir.tempDir('move-dest-dir');
    const moved = moveSource.moveTo(moveDestDir);
    assert.equal(moveSource.exists, false);
    assert.equal(moved.exists, true);
    assert.equal(moved.dir, moveDestDir.path);
  });

  it('Moves files to another directory', () => {
    const source = testDir.file('move-source.txt');
    source.writeText('test');
    const destDir = testDir.tempDir('move-dest');
    const moved = source.moveTo(destDir.path);
    assert.equal(source.exists, false);
    assert.equal(moved.exists, true);
    assert.equal(moved.readText(), 'test');
    assert.equal(moved.dir, destDir.path);
  });

  it('Preserves the subclass type when copying and moving', () => {
    const source = testDir.file('preserve-type').json({ key: 'val' });
    const copyDestDir = testDir.tempDir('preserve-copy-dest');
    const copy = source.copyTo(copyDestDir.path);
    assert.instanceOf(copy, FileJson);
    assert.deepEqual(copy.read(), { key: 'val' });

    const moveDestDir = testDir.tempDir('preserve-move-dest');
    const moved = source.moveTo(moveDestDir.path);
    assert.instanceOf(moved, FileJson);
    assert.deepEqual(moved.read(), { key: 'val' });
  });
});

describe('FileTypeJson', () => {
  it('Saves data as json', () => {
    const file = testDir.file('jsonfile-data').json(thing);
    assert.deepStrictEqual(file.read(), thing);
    file.write(thing);
    assert.deepStrictEqual(file.read(), thing);
  });

  it('Does not create file when reading', () => {
    const file = testDir.file('test123').json();
    const contents = file.read();
    assert(contents === undefined);
    assert(!file.exists);
  });

  it('can be created using ~ (home) in path', () => {
    const file = new File.json('~/example.json');
    if (process.env.HOME) assert(file.path.startsWith(process.env.HOME));
  });
});

describe('FileTypeNdjson', () => {
  it('Appends new lines correctly', () => {
    const file = testDir.file('appends-lines').ndjson();
    file.delete();
    file.append([thing, thing]);
    assert(file.read().length === 2);
    file.append(thing);
    assert(file.read().length === 3);
    file.read().forEach(line => {
      assert.deepStrictEqual(line, thing);
    });
  });

  it('Adds file extension when needed', () => {
    const test = testDir.file('test').ndjson();
    assert(test.path.includes(testDir.path));
    assert(test.path.includes('.ndjson'));
    const test2 = testDir.file('test2').ndjson();
    assert(!test2.path.includes('.ndjson.ndjson'));
  });
});

describe('FileTypeCsv', () => {
  it('Saves data as csv', async () => {
    const things = [thing, thing, thing];
    const file = await testDir.file('csv-data').csv(things);
    const parsed = await file.read();
    parsed.forEach(row => {
      assert.deepEqual(row, thing);
    });
  });
  it('Reads file that does not exist', async () => {
    const file = await testDir.file('bogus').csv();
    const contents = await file.read();
    assert(Array.isArray(contents));
    assert(contents.length === 0);
  });
});
