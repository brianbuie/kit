import * as fs from 'node:fs';
import * as path from 'node:path';
import { Readable, Writable } from 'node:stream';
import { finished } from 'node:stream/promises';
import trash from 'trash';
import mime from 'mime-types';

/**
 * Shared filesystem operations for the public File facade and format files.
 */
export class FileBase {
  /**
   * The absolute path of the file
   */
  path: string;
  /**
   * The root of the path such as '/' or 'c:'
   */
  root: string;
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
  ext: string;
  /**
   * The full content type, based on the extension, eg. 'application/json' or 'text/html'
   */
  type?: string;

  constructor(filepath: string) {
    this.path = this.resolve(filepath);
    const { root, dir, base, ext, name } = path.parse(this.path);
    this.root = root;
    this.dir = dir;
    this.base = base;
    this.name = name;
    this.ext = ext;
    this.type = mime.lookup(ext) || undefined;
  }

  private resolve = (filepath: string): string => {
    if (filepath.startsWith('~')) {
      if (!process.env.HOME) throw new Error("Can't resolve process.env.HOME for '~' in path.");
      return path.join(process.env.HOME, filepath.slice(1));
    }
    return path.resolve(filepath);
  };

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

  writeStream = async (contents: ReadableStream): Promise<void> => {
    return finished(Readable.from(contents).pipe(this.writable));
  };

  delete = (): void => {
    if (this.exists) fs.rmSync(this.path, { force: true });
  };

  /**
   * Move the file to the system's trash, in case you mess up and need to restore it.
   */
  trash = async (): Promise<void> => {
    if (this.exists) return trash(this.path);
  };

  /**
   * Copy the file to another directory. If the file doesn't exist, nothing is copied, but the new File instance is still returned
   * @returns
   * A new File instance at the new location
   */
  copyTo = (dirPath: string): FileBase => {
    const newFile = new (this.constructor as typeof FileBase)(path.join(dirPath, this.base));
    if (this.exists) {
      fs.mkdirSync(dirPath, { recursive: true });
      fs.copyFileSync(this.path, newFile.path);
    }
    return newFile;
  };

  /**
   * Copy the file to another directory. (copies the file and deletes the original)
   * @returns
   * A new File instance at the new location
   */
  moveTo = (dirPath: string): FileBase => {
    const newFile = this.copyTo(dirPath);
    this.delete();
    return newFile;
  };
}
