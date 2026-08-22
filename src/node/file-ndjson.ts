import { FileBase } from './file-base.ts';

/**
 * New-line delimited json file (.ndjson)
 * @see https://jsonltools.com/ndjson-format-specification
 */
export class FileNdjson<T extends object> extends FileBase {
  constructor(filepath: string) {
    super(filepath.endsWith('.ndjson') ? filepath : filepath + '.ndjson');
  }

  append = (lines: T | T[]): void => {
    this.appendTextLines(Array.isArray(lines) ? lines.map(line => JSON.stringify(line)) : JSON.stringify(lines));
  };

  read = (): T[] => {
    return this.readTextLines().map(line => JSON.parse(line) as T);
  };
}
