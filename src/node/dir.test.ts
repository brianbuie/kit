import { describe, it } from 'node:test';
import assert from 'node:assert';
import { temp, Dir } from './dir.ts';

describe('Dir', () => {
  const testDir = temp.dir('dir-test');
  testDir.clear();

  it('Sanitizes filenames', () => {
    const name = testDir.sanitize(':/something/else.json');
    assert(!name.includes('/'));
    assert(!name.includes(':'));
  });

  it('Creates sub directories', () => {
    const subPath = 'sub/dir';
    const sub = testDir.dir(subPath);
    assert(sub.path.includes(testDir.path));
    assert(sub.path.includes(subPath));
    assert(testDir.dirs.length > 0);
  });

  it('Creates sub directory using date when no input provided', () => {
    const sub = testDir.dir();
    assert(sub.path.includes(testDir.path));
    assert(/\d{8}/g.test(sub.path));
  });

  it('Creates files using date when no input provided', () => {
    const f = testDir.file();
    assert(/\d{8}-\d{6}/g.test(f.path));
  });

  it('Handles ~ (home) input', () => {
    const homeDir = new Dir('~/example');
    if (process.env.HOME) assert(homeDir.pathUnsafe.includes(process.env.HOME));
  });

  it('.tempDir returns temporary directory', () => {
    const sub = testDir.tempDir('example');
    assert(sub.isTemp);
  });

  it('.dir() makes relative paths', () => {
    assert(testDir.dir('/').path.includes(testDir.path));
  });

  it('.isTemp flows down to child Dirs', () => {
    const base = testDir.tempDir('temp-by-default');
    const child = base.dir('child');
    assert(child.isTemp);
  });

  it('Resolves filenames in folder', () => {
    const txt = testDir.filepath('test.txt');
    assert(txt.includes(testDir.path));
    assert(txt.includes('test.txt'));
  });

  it('Lists files, directories, and typed files', () => {
    const contents = testDir.tempDir('contents');
    const child = contents.dir('child');
    const txt = contents.file('notes.txt');
    const csv = contents.file('rows.csv');
    const json = contents.file('data.json');
    const ndjson = contents.file('events.ndjson');

    child.path;
    txt.writeText('notes');
    csv.writeText('name\nAda');
    json.writeText('{}');
    ndjson.writeText('{}');

    assert.deepEqual(
      contents.dirs.map(dir => dir.path),
      [child.path],
    );
    assert.deepEqual(
      contents.files.map(file => file.path).sort(),
      [txt, csv, json, ndjson].map(file => file.path).sort(),
    );
    assert.deepEqual(
      contents.txtFiles.map(file => file.path),
      [txt.path],
    );
    assert.deepEqual(
      contents.csvFiles.map(file => file.path),
      [csv.path],
    );
    assert.deepEqual(
      contents.jsonFiles.map(file => file.path),
      [json.path],
    );
    assert.deepEqual(
      contents.ndjsonFiles.map(file => file.path),
      [ndjson.path],
    );
  });

  it('Only clears temporary directories', () => {
    const regular = new Dir(testDir.filepath('not-temporary'));
    const temporary = testDir.tempDir('clearable');
    const file = temporary.file('data.txt');

    file.writeText('data');

    assert.throws(() => regular.clear(), /Dir is not temporary/);
    temporary.clear();
    assert.deepEqual(temporary.contents, []);
  });

  it('is extendable and chains methods correctly', () => {
    class Example extends Dir {
      get testFiles() {
        return this.files.filter(f => f.ext === '.test');
      }
    }
    const testRoot = testDir.tempDir('extendable');
    const test = new Example(testRoot.path);
    const child = test.dir('child');
    assert(child instanceof Example);
    const childFile = child.file('child.test');
    childFile.writeText('');
    assert(child.testFiles.map(f => f.path).includes(childFile.path));
    assert(test.dirs.map(d => d.path).includes(child.path));
    const childTemp = child.tempDir('temp-child');
    assert(childTemp instanceof Example);
    childTemp.file('child-temp').json({});
    assert(childTemp.jsonFiles.length === 1);
  });
});
