import * as fs from 'node:fs';
import { merge } from 'lodash-es';
import sanitizeFilename from 'sanitize-filename';
import { File } from './file.ts';
import { parsePath } from './parse-path.ts';
import { Format, Env } from '../core/_index.ts';

type FileOptions = {
  date?: boolean;
};

export type DirOptions = FileOptions & {
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
  options: DirOptions;

  constructor(where = Format.date('ymd'), options: DirOptions = {}) {
    Env.throwIfWin32();
    this.inputPath = where;
    this.options = options;
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
  dir = (subPath = Format.date('ymd'), opts: DirOptions = {}): typeof this => {
    const newPath = subPath.startsWith('/') ? subPath.slice(1) : subPath;
    const options = merge({}, this.options, opts);
    return new (this.constructor as typeof Dir)(parsePath(newPath, this.path).path, options) as this;
  };

  /**
   * Creates a new temp directory inside current Dir
   * @param subPath joined with parent Dir's path to make new TempDir
   */
  tempDir = (subPath?: string, opts: DirOptions = {}): typeof this => {
    return this.dir(subPath, merge({ temp: true }, opts));
  };

  sanitize = (filename: string): string => {
    const notUrl = filename.replace('https://', '').replace('www.', '');
    return sanitizeFilename(notUrl, { replacement: '_' }).slice(-200);
  };

  /**
   * Provides the full filepath for a file in this directory (it doesn't need to exist on the filesystem)
   * @param base - The file base (name and extension). Defaults to 'ymd-hms' date if not provided.
   * @param options - optional `{ date: true }` to prefix the filename with 'ymd-hms' date (can also be set in the Dir's options)
   * @example
   * const folder = new Dir('example');
   * const filepath = folder.resolve('file.json');
   * // '/path/to/example/file.json'
   */
  filepath = (base?: string, opts: FileOptions = {}): string => {
    if (!base) return parsePath(Format.date('ymd-hms'), this.path).path;
    const options = merge({}, this.options, opts);
    const name = options.date ? `${Format.date('ymd-hms')}-${base}` : base;
    return parsePath(this.sanitize(name), this.path).path;
  };

  /**
   * Create a new File instance in this directory.
   * @param base - The file base (name and extension). Defaults to 'ymd-hms' date if not provided.
   * @param options - optional `{ date: true }` to prefix the filename with 'ymd-hms' date (can also be set in the Dir's options)
   */
  file = (base?: string, opts: FileOptions = {}): File => {
    return new File(this.filepath(base, opts));
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
    if (!this.options.temp) throw new Error('Dir is not temporary');
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
