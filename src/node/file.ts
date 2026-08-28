import { FileBase } from './file-base.ts';
import { FileCsv, type FileCsvOptions } from './file-csv.ts';
import { FileImage } from './file-image.ts';
import { FileJson } from './file-json.ts';
import { FileNdjson } from './file-ndjson.ts';
import { FileVideo } from './file-video.ts';

/**
 * Represents a file on the file system. If the file doesn't exist, it is created the first time it is written to.
 */
export class File extends FileBase {
  /**
   * @returns FileJson adaptor for current File, adds '.json' extension if not present.
   * @example
   * const file = new File('./data').json({ key: 'val' }); // FileJson<{ key: string; }>
   * console.log(file.path) // '/path/to/cwd/data.json'
   * file.write({ something: 'else' }) // ❌ property 'something' doesn't exist on type { key: string; }
   * @example
   * const file = new File('./data').json<object>({ key: 'val' }); // FileJson<object>
   * file.write({ something: 'else' }) // ✅ data is typed as object
   */
  json = <T>(contents?: T): FileJson<T> => {
    const jsonFile = new FileJson<T>(this.path);
    if (contents) jsonFile.write(contents);
    return jsonFile;
  };

  static get json(): typeof FileJson {
    return FileJson;
  }

  /**
   * @returns FileNdjson adaptor for current File, adds '.ndjson' extension if not present.
   */
  ndjson = <T extends object>(lines?: T | T[]): FileNdjson<T> => {
    const ndjsonFile = new FileNdjson<T>(this.path);
    if (lines) ndjsonFile.append(lines);
    return ndjsonFile;
  };

  static get ndjson(): typeof FileNdjson {
    return FileNdjson;
  }

  /**
   * @returns FileCsv adaptor for current File, adds '.csv' extension if not present.
   * @example
   * const file = await new File('a').csv([{ col: 'val' }, { col: 'val2' }]); // FileCsv<{ col: string; }>
   * await file.write([ { col2: 'val2' } ]); // ❌ 'col2' doesn't exist on type { col: string; }
   * await file.write({ col: 'val' }); // ✅ Writes one row
   * await file.write([{ col: 'val2' }, { col: 'val3' }]); // ✅ Writes multiple rows
   */
  csv = async <T extends object>(rows?: T[], options?: FileCsvOptions<T>): Promise<FileCsv<T>> => {
    const csvFile = new FileCsv<T>(this.path, options);
    if (rows) await csvFile.write(rows);
    return csvFile;
  };

  static get csv(): typeof FileCsv {
    return FileCsv;
  }

  image = async (stream?: ReadableStream): Promise<FileImage> => {
    const imageFile = new FileImage(this.path);
    if (stream) await imageFile.writeStream(stream);
    return imageFile;
  };

  static get image(): typeof FileImage {
    return FileImage;
  }

  video = async (stream?: ReadableStream): Promise<FileVideo> => {
    const videoFile = new FileVideo(this.path);
    if (stream) await videoFile.writeStream(stream);
    return videoFile;
  };

  static get video(): typeof FileVideo {
    return FileVideo;
  }
}

export { type FileCsvOptions } from './file-csv.ts';
export { type VideoDimensions } from './file-video.ts';
