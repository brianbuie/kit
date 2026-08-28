import { describe, it, assert } from 'vitest';
import { parsePath } from './parse-path.ts';

describe('parsePath', () => {
  it('Parses an absolute path to a file', () => {
    assert.deepEqual(parsePath('/path/to/file.txt'), {
      path: '/path/to/file.txt',
      dir: '/path/to',
      base: 'file.txt',
      name: 'file',
      ext: '.txt',
    });
  });

  it('Parses an absolute path to a directory', () => {
    assert.deepEqual(parsePath('/path/to/directory'), {
      path: '/path/to/directory',
      dir: '/path/to/directory',
    });
  });

  it('Parses a relative path to a file using the current working directory', () => {
    assert.deepEqual(parsePath('path/to/file.txt'), {
      path: `${process.cwd()}/path/to/file.txt`,
      dir: `${process.cwd()}/path/to`,
      base: 'file.txt',
      name: 'file',
      ext: '.txt',
    });
  });

  it('Parses a relative path to a directory using the current working directory', () => {
    assert.deepEqual(parsePath('path/to/directory'), {
      path: `${process.cwd()}/path/to/directory`,
      dir: `${process.cwd()}/path/to/directory`,
    });
  });

  it('Parses a relative path to a file using a directory parameter', () => {
    assert.deepEqual(parsePath('path/to/file.txt', '/from/directory'), {
      path: '/from/directory/path/to/file.txt',
      dir: '/from/directory/path/to',
      base: 'file.txt',
      name: 'file',
      ext: '.txt',
    });
  });

  it('Parses a relative path to a directory using a directory parameter', () => {
    assert.deepEqual(parsePath('path/to/directory', '/from/directory'), {
      path: '/from/directory/path/to/directory',
      dir: '/from/directory/path/to/directory',
    });
  });

  it('Parses a dot file without an extension', () => {
    assert.deepEqual(parsePath('/path/to/.gitignore'), {
      path: '/path/to/.gitignore',
      dir: '/path/to',
      base: '.gitignore',
      name: '.gitignore',
      ext: undefined,
    });
  });

  it('Resolves home directory input', () => {
    assert.deepEqual(parsePath('~/path/to/file.txt'), {
      path: `${process.env.HOME}/path/to/file.txt`,
      dir: `${process.env.HOME}/path/to`,
      base: 'file.txt',
      name: 'file',
      ext: '.txt',
    });
  });

  it('Parses a file with multiple dots using the last extension', () => {
    assert.deepEqual(parsePath('/path/to/archive.tar.gz'), {
      path: '/path/to/archive.tar.gz',
      dir: '/path/to',
      base: 'archive.tar.gz',
      name: 'archive.tar',
      ext: '.gz',
    });
  });

  it('Parses a directory with a trailing slash', () => {
    assert.deepEqual(parsePath('/path/to/directory/'), {
      path: '/path/to/directory',
      dir: '/path/to/directory',
    });
  });
});
