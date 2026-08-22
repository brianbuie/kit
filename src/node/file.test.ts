import { describe, it } from 'node:test';
import assert from 'node:assert';
import { temp } from './dir.ts';
import { File } from './file.ts';

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
