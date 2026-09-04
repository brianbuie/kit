import { describe, it, assert } from 'vitest';
import { Path } from './path.ts';

describe('Path', () => {
  it('Resolves absolute paths', () => {
    assert.deepEqual(new Path('/abs/path').resolved, '/abs/path');
    assert.deepEqual(new Path('/abs/path', '/from').resolved, '/abs/path');
  });

  it('Resolves relative paths', () => {
    assert.deepEqual(new Path('some/dir').resolved, `${process.cwd()}/some/dir`);
    assert.deepEqual(new Path('some/dir', '/from').resolved, '/from/some/dir');
  });

  it('Joins absolute paths', () => {
    assert.deepEqual(new Path('/some/dir').join('/another'), '/some/dir/another');
  });

  it('Validates a directory is safe to delete, or throws', () => {
    assert.throws(() => new Path('/').canDelete());
    assert.throws(() => new Path(process.cwd()).canDelete());
    assert.doesNotThrow(() => new Path('/abs/.dir').canDelete());
  });
});
