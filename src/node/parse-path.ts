export type ParsedPath = {
  path: string;
  dir: string;
  base?: string;
  name?: string;
  ext?: string;
};

/**
 * Like node's `path.parse()`, but better.
 * @param input
 * The path to a directory or a file
 * @param from
 * An optional path for resolving relative paths (defaults to current working directory)
 *
 * @returns (when it's a directory)
 * `{ path, dir }` will both be the resolved path
 *
 * @returns (when it's a file)
 * `{ path, dir, base, name, ext }`
 *
 * @example
 * parsePath('/path/to/file.txt');
 * {
 *  path: '/path/to/file.txt',
 *  dir: '/path/to',
 *  base: 'file.txt',
 *  name: 'file',
 *  ext: '.txt'
 * }
 */
export function parsePath(input: string, from = process.cwd()): ParsedPath {
  const resolved = input.startsWith('/') ? input : [from, input.replace(/^.\//, '')].join('/');
  const path = resolved === '/' ? resolved : resolved.replace(/\/+$/, '');
  const segments = path.split('/').filter(s => s.length > 0);
  const isFile = Boolean(segments.at(-1)?.includes('.'));

  if (isFile) {
    const dir = '/' + segments.slice(0, segments.length - 1).join('/');
    const base = segments.at(-1)!;
    const lastDot = base.lastIndexOf('.');
    const beforeDot = base.slice(0, lastDot);
    const dotAnd = base.slice(lastDot);
    return {
      path,
      dir,
      base,
      name: beforeDot.length > 0 ? beforeDot : base,
      ext: beforeDot.length > 0 ? dotAnd : undefined,
    };
  }
  return {
    path,
    dir: '/' + segments.join('/'),
  };
}
