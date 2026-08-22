import { parseStream, writeToStream } from 'fast-csv';
import { FileBase } from './file-base.ts';
import { finished } from 'node:stream/promises';

type CsvValue = string | number | boolean | null;

export type FileCsvOptions<Row extends object> = {
  parseNumbers?: boolean;
  parseBooleans?: boolean;
  parseNulls?: boolean;
  keys?: (keyof Row)[];
};

/**
 * Comma separated values (.csv).
 * Input rows as objects, keys are used as column headers
 */
export class FileCsv<Row extends object> extends FileBase {
  options: FileCsvOptions<Row>;

  constructor(filepath: string, options: FileCsvOptions<Row> = {}) {
    super(filepath.endsWith('.csv') ? filepath : filepath + '.csv');
    this.options = {
      parseNumbers: true,
      parseBooleans: true,
      parseNulls: true,
      ...options,
    };
  }

  write = async (rows: Row[]): Promise<void> => {
    const headerSet = new Set<keyof Row>();
    if (this.options.keys) {
      for (const key of this.options.keys) headerSet.add(key);
    } else {
      for (const row of rows) {
        for (const key in row) headerSet.add(key);
      }
    }
    const headers = Array.from(headerSet);
    const outRows = rows.map(row => headers.map(key => row[key]));
    await finished(writeToStream(this.writable, [headers, ...outRows]));
  };

  read = async (): Promise<Row[]> => {
    const parseValue = (val: string): CsvValue => {
      if (this.options.parseBooleans && val.toLowerCase() === 'false') return false;
      if (this.options.parseBooleans && val.toLowerCase() === 'true') return true;
      if (this.options.parseNulls && (val.length === 0 || val.toLowerCase() === 'null')) return null;
      if (this.options.parseNumbers && /^[\.0-9]+$/.test(val)) return Number(val);
      return val;
    };

    return new Promise<Row[]>((resolve, reject) => {
      const parsed: Row[] = [];
      parseStream(this.readable, { headers: true })
        .on('data', (raw: Record<keyof Row, string>) => {
          parsed.push(
            Object.entries(raw).reduce((all, [key, val]) => ({ ...all, [key]: parseValue(val as string) }), {} as Row),
          );
        })
        .on('error', reject)
        .on('end', () => resolve(parsed));
    });
  };
}
