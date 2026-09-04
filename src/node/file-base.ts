import * as fs from 'node:fs';
import * as path from 'node:path';
import { Readable, Writable } from 'node:stream';
import { finished } from 'node:stream/promises';
import trash from 'trash';
import mime from 'mime-types';
import type { Dir } from './dir.ts';
import { Env } from '../core/_index.ts';
import { parsePath } from './parse-path.ts';

/**
 * Shared filesystem operations for the public File facade and format files.
 */
export class FileBase {
  /**
   * The absolute path of the file
   */
  path: string;
  /**
   * The full directory path such as '/home/user/dir' or 'c:\path\dir'
   */
  dir: string;
  /**
   * The file name including extension (if any) such as 'index.html'
   */
  base: string;
  /**
   * The file name without extension (if any) such as 'index'
   */
  name: string;
  /**
   * The file extension (if any) such as '.html'
   */
  ext?: string;
  /**
   * The full content type, based on the extension, eg. 'application/json' or 'text/html'
   */
  type?: string;

  constructor(filepath: string) {
    Env.throwIfWin32();
    this.path = parsePath(filepath).path;
    // Need to assume last segment in filepath is the filename, even if it doesn't have an extension
    const { base, name, dir, ext } = path.parse(this.path);
    this.dir = dir;
    this.base = base;
    this.name = name;
    this.ext = ext;
    this.type = mime.lookup(ext || '') || undefined;
  }

  prepareWrite = () => {
    fs.mkdirSync(this.dir, { recursive: true });
  };

  get exists(): boolean {
    return fs.existsSync(this.path);
  }

  get stats(): Partial<fs.Stats> {
    return this.exists ? fs.statSync(this.path) : {};
  }

  get readable(): Readable {
    return this.exists ? fs.createReadStream(this.path) : Readable.from([]);
  }

  get writable(): Writable {
    this.prepareWrite();
    return fs.createWriteStream(this.path);
  }

  readText = (): string | undefined => (this.exists ? fs.readFileSync(this.path, 'utf8') : undefined);

  writeText = (contents: string): void => {
    this.prepareWrite();
    fs.writeFileSync(this.path, contents);
  };

  readTextLines = (): string[] => {
    const contents = (this.readText() || '').split('\n');
    return contents.at(-1)?.length ? contents : contents.slice(0, contents.length - 1);
  };

  appendTextLines = (lines: string | string[]): void => {
    if (!this.exists) this.writeText('');
    const contents = Array.isArray(lines) ? lines.join('\n') : lines;
    fs.appendFileSync(this.path, contents + '\n');
  };

  writeStream = async (contents: ReadableStream): Promise<void> =>
    finished(Readable.from(contents).pipe(this.writable));

  delete = (): void => fs.rmSync(this.path, { force: true });

  /**
   * Move the file to the system's trash, in case you mess up and need to restore it.
   */
  trash = async (): Promise<void> => trash(this.path);

  /**
   * Create a new File instance at a new location.
   */
  protected cloneTo = (dir: string | Dir, newBase?: string): this => {
    const { path } = parsePath(typeof dir === 'string' ? dir : dir.path);
    const newPath = [path, newBase || this.base].join('/');
    return new (this.constructor as new (filepath: string) => this)(newPath);
  };

  /**
   * Copy the file to a new location. If the source file doesn't exist, nothing is copied, but the new File instance is still returned.
   * The the new file will have the same name, unless a second parameter for the new base (eg. file.txt) is provided
   * This will overwrite the new filepath if it already exists.
   * @returns
   * A new File instance (eg. FileBase, FileJson) at the new location.
   */
  copyTo = (dir: string | Dir, newBase?: string): this => {
    const newFile = this.cloneTo(dir, newBase);
    if (this.exists) {
      newFile.prepareWrite();
      fs.copyFileSync(this.path, newFile.path);
    }
    return newFile;
  };

  /**
   * Move the file to a new location. If the source file doesn't exist, nothing is created, but the new File instance is still returned.
   * The the new file will have the same name, unless a second parameter for the new base (eg. file.txt) is provided
   * This will overwrite the new filepath if it already exists.
   * @returns
   * A new File instance (eg. FileBase, FileJson) at the new location.
   */
  moveTo = (dir: string | Dir, newBase?: string): this => {
    const newFile = this.cloneTo(dir, newBase);
    if (this.exists) {
      newFile.prepareWrite();
      fs.renameSync(this.path, newFile.path);
    }
    return newFile;
  };
}
