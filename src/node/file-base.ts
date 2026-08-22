import * as fs from 'node:fs';
import * as path from 'node:path';
import { Readable, Writable } from 'node:stream';
import { finished } from 'node:stream/promises';
import mime from 'mime-types';

/**
 * Shared filesystem operations for the public File facade and format files.
 */
export class FileBase {
  path: string;
  root: string;
  dir: string;
  base: string;
  name: string;
  ext: string;
  type?: string;

  constructor(filepath: string) {
    this.path = this.#resolve(filepath);
    const { root, dir, base, ext, name } = path.parse(this.path);
    this.root = root;
    this.dir = dir;
    this.base = base;
    this.name = name;
    this.ext = ext;
    this.type = mime.lookup(ext) || undefined;
  }

  #resolve = (filepath: string): string => {
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

  delete = (): void => {
    fs.rmSync(this.path, { force: true });
  };

  readText = (): string | undefined => {
    return this.exists ? fs.readFileSync(this.path, 'utf8') : undefined;
  };

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
}
