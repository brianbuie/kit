import * as fs from 'node:fs';
import sanitizeFilename from 'sanitize-filename';
import { File } from './file.ts';
import { parsePath } from './parse-path.ts';
import { Format } from '../core/_index.ts';

export type DirOptions = {
  temp?: boolean;
};

/**
 * Reference to a specific directory with methods to create and list files.
 * @param where
 * The path of the directory (relative to cwd or absolute).
 * The directory is created on file system the first time `.path` is read or any methods are used. Default: `./YYYYMMDD`.
 * If you need the path, but don't want to create the directory yet, use `.pathUnsafe` (unsafe because it might not exist)
 * @param options
 * include `{ temp: true }` to enable the `.clear()` method
 */
export class Dir {
  protected inputPath: string;
  protected resolved?: string;
  isTemp: boolean;

  constructor(where = Format.date('ymd'), options: DirOptions = {}) {
    this.inputPath = where;
    this.isTemp = Boolean(options.temp);
  }

  /**
   * The path of the directory, which might not exist yet.
   */
  get pathUnsafe(): string {
    if (this.resolved) return this.resolved;
    return parsePath(this.inputPath).path;
  }

  /**
   * The path of this Dir instance. Created on file system the first time this property is read/used.
   * Safe to use the directory immediately, without calling mkdir separately.
   */
  get path(): string {
    // avoids calling mkdir every time path is read
    if (!this.resolved) {
      this.resolved = this.pathUnsafe;
      fs.mkdirSync(this.resolved, { recursive: true });
    }
    return this.resolved;
  }

  /**
   * The last segment in the path. Doesn't read this.path, to avoid creating directory on file system before it's needed.
   * @example
   * const example = new Dir('/path/to/folder');
   * console.log(example.name); // "folder"
   */
  get name(): string {
    return this.pathUnsafe
      .split('/')
      .filter(s => s.length > 0)
      .at(-1)!;
  }

  /**
   * Create a new Dir inside the current Dir
   * @param subPath
   * joined with parent Dir's path to make new Dir
   * @param options
   * include `{ temp: true }` to enable the `.clear()` method. If current Dir is temporary, child directories will also be temporary.
   * @example
   * const folder = new Dir('example');
   * // folder.path = '/path/to/cwd/example'
   * const child = folder.dir('path/to/dir');
   * // child.path = '/path/to/cwd/example/path/to/dir'
   */
  dir = (subPath = Format.date('ymd'), options: DirOptions = { temp: this.isTemp }): Dir => {
    const newPath = subPath.startsWith('/') ? subPath.slice(1) : subPath;
    return new (this.constructor as typeof Dir)(parsePath(newPath, this.path).path, options) as this;
  };

  /**
   * Creates a new temp directory inside current Dir
   * @param subPath joined with parent Dir's path to make new TempDir
   */
  tempDir = (subPath?: string): Dir => {
    return this.dir(subPath, { temp: true });
  };

  sanitize = (filename: string): string => {
    const notUrl = filename.replace('https://', '').replace('www.', '');
    return sanitizeFilename(notUrl, { replacement: '_' }).slice(-200);
  };

  /**
   * @param base - The file base (name and extension)
   * @example
   * const folder = new Dir('example');
   * const filepath = folder.resolve('file.json');
   * // '/path/to/example/file.json'
   */
  filepath = (base: string): string => {
    return parsePath(this.sanitize(base), this.path).path;
  };

  /**
   * Create a new file in this directory. Filename defaults to `YYYYMMDD-HHMMSS` if not provided
   */
  file = (base = Format.date('ymd-hms')): File => {
    return new File(this.filepath(base));
  };

  /**
   * All files and subdirectories in in this directory, returned as Dir and File instances
   */
  get contents(): (Dir | File)[] {
    return fs
      .readdirSync(this.path)
      .map(name => (fs.statSync(parsePath(name, this.path).path).isDirectory() ? this.dir(name) : this.file(name)));
  }

  /**
   * All subdirectories in this directory
   */
  get dirs(): Dir[] {
    return this.contents.filter(f => f instanceof Dir);
  }

  /**
   * All files in this directory
   */
  get files(): File[] {
    return this.contents.filter(f => !(f instanceof Dir)) as File[];
  }

  /**
   * All files with MIME type that includes "video"
   */
  get videos(): File[] {
    return this.files.filter(f => f.type?.includes('video'));
  }

  /**
   * All files with MIME type that includes "image"
   */
  get images(): File[] {
    return this.files.filter(f => f.type?.includes('image'));
  }

  /**
   * All files with ext ".json"
   * @example
   * // Directory of json files with the same shape
   * const dataFiles = dataDir.jsonFiles.map(f => f.json<ExampleType>());
   * // dataFiles: FileTypeJson<ExampleType>[]
   */
  get jsonFiles(): File[] {
    return this.files.filter(f => f.ext === '.json');
  }

  /**
   * All files with ext ".ndjson"
   * @example
   * // Directory of ndjson files with the same shape
   * const dataFiles = dataDir.ndjsonFiles.map(f => f.ndjson<ExampleType>());
   * // dataFiles: FileTypeNdjson<ExampleType>[]
   */
  get ndjsonFiles(): File[] {
    return this.files.filter(f => f.ext === '.ndjson');
  }

  /**
   * All files with ext ".csv"
   * @example
   * // Directory of csv files with the same shape
   * const dataFiles = dataDir.csvFile.map(f => f.csv<ExampleType>());
   * // dataFiles: FileTypeCsv<ExampleType>[]
   */
  get csvFiles(): File[] {
    return this.files.filter(f => f.ext === '.csv');
  }

  /**
   * All files with ext ".txt"
   */
  get txtFiles(): File[] {
    return this.files.filter(f => f.ext === '.txt');
  }

  /**
   * Deletes the contents of the directory. Only allowed if created with `temp` option set to `true` (or created with `dir.tempDir` method).
   */
  clear = (): void => {
    if (!this.isTemp) throw new Error('Dir is not temporary');
    fs.rmSync(this.path, { recursive: true, force: true });
    fs.mkdirSync(this.path, { recursive: true });
  };
}

/**
 * Current working directory
 */
export const cwd = new Dir('./');

/**
 * ./.temp in current working directory
 */
export const temp = cwd.tempDir('.temp');
