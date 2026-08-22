import { FileBase } from './file-base.ts';

/**
 * A .json file that maintains data type when reading/writing.
 * > ⚠️ This is mildly unsafe, json files should be validated at runtime!
 * @example
 * const file = new FileJson('./data', { key: 'val' }); // FileJson<{ key: string; }>
 * console.log(file.path) // '/path/to/cwd/data.json'
 * file.write({ something: 'else' }) // ❌ property 'something' doesn't exist on type { key: string; }
 * @example
 * const file = new FileJson<object>('./data', { key: 'val' }); // FileJson<object>
 * file.write({ something: 'else' }) // ✅ data is typed as object
 */
export class FileJson<T> extends FileBase {
  constructor(filepath: string) {
    super(filepath.endsWith('.json') ? filepath : filepath + '.json');
  }

  read = (): T | undefined => {
    const contents = this.readText();
    return contents ? (JSON.parse(contents) as T) : undefined;
  };

  write = (contents: T): void => {
    this.writeText(JSON.stringify(contents, null, 2));
  };
}
