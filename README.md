# Kit

Basic tools for quick projects

# Installing

[![NPM Version](https://img.shields.io/npm/v/%40brianbuie%2Fkit)](https://www.npmjs.com/package/@brianbuie/kit)

```
npm add @brianbuie/kit
```

```ts
import { Fetcher } from '@brianbuie/kit';
```

Consumers should get the correct modules when importing from `@brianbuie/kit`. If you run into issues with node.js's modules being bundled for the browser, you can import from `@brianbuie/kit/core` instead.

```ts
import { Fetcher } from '@brianbuie/kit/core';
```

The `TypeWriter` module is separate from the main export and needs `quicktype-core` installed as a peer dependency.

```ts
import { TypeWriter } from '@brianbuie/kit/type-writer';
```

## Extending Config

### tsconfig.json

```json
{
  "extends": "./node_modules/@brianbuie/kit/tsconfig.json"
}
```

### prettier.config.js

```js
export * from './node_modules/@brianbuie/kit/prettier.config.js';
```

Or make changes:

```js
import baseConfig from './node_modules/@brianbuie/kit/prettier.config.js';

const config = {
  ...baseConfig,
  printWidth: 80,
};

export default config;
```

# Changelog

## 3.1.0

- Changed my mind about `Env.var`, switched to `Env.get` (might be defined) and `Env.need` (throws when undefined)

## 3.0.1

- `Env.var` can be called with a second argument for `required`, to throw when not found.

## 3.0.0

- Platform neutral export renamed to `@brianbuie/kit/core`
- `Cache` option for save location is now `dir` (was `path`).
  - Breaking: Defaults to in-memory store if `dir` is not provided
  - Can be used in the browser now (uses local storage)
- `Log` can be used in browser

## 2.0.7

- Fix incorrect export for `@brianbuie/kit/neutral`

## 2.0.5

- Node and platform neutral pieces are exported separately now
  - All should be importable from `@brianbuie/kit` in node
  - If needed, import platform neutral parts (`Fetcher`, `Format`, `snapshot`, `timeout`) from `@brianbuie/kit/neutral`

## 2.0.3

- Changed name from `@brianbuie/node-kit` to just `@brianbuie/kit`

## 2.0.0

- `Log` reverted to previous custom implementation, no more pino
  - `Log.alert` (was `Log.fatal`)
  - Fixed log levels for Google Cloud
  - New `isGcloud` and `isProd` properties (defaults from `process.env`)
- `Fetcher` added new options to override transport and delay methods
- `Cache` uses config object instead of multiple args. Added options for `path`.
- `TypeWriter` is now a separate export
  - `quicktype-core` needs to be installed as a dependency in projects that use it
  - Needs to be imported from "@brianbuie/kit/TypeWriter"
- `File` refactored to `FileBase` that's inherited by all file types
  - If projects relied on `instanceof File`, that won't work anymore.

## 1.0.0

- `File` Breaking changes,
  - Removed intermediate `FileType` class, all types now inherit from `File`
  - Base `File` class
    - `read()` → `readText()`
    - `write()` → `writeText()` and doesn't handle writing from stream anymore
    - `writeStream()` is a method now and writes from readable stream
    - `get writeStream` → `get writable`
    - `get readStream` → `get readable`
    - `lines()` → `readTextLines()`
    - `append()` → `appendTextLines()`
  - None of the file types can be constructed with initial data anymore, since some of the writes are async and some file types have additional options, which is confusing.
    - The `File.json`, `File.csv`, etc. methods do still allow initial data, since that creation method can be async
  - The other methods on specific file types should be the same as before.
- All class methods now use arrow functions, to prevent binding issues.
- `Cmd.ffmpeg` and `Cmd.ffprobe` look for `process.env.FFMPEG_PATH` and `process.env.FFPROBE_PATH` locations

## 0.16.1

- New `Cmd` utility for running shell commands, handling output and errors
  - `Cmd.ffmpeg` and `Cmd.ffprobe` added with basic config for handling output (ffmpeg and ffprobe need to be installed separately)
- New `FileTypeImage` and `FileTypeVideo` extensions with methods to get media dimensions

## 0.16.0

- `Log` rewritten using [pino](https://github.com/pinojs/pino) under the hood. Will require updates in projects:
  - `message` is still first argument, but second argument should include all details, instead of using an arbitrary number of args
  - Errors should use the `err` key in the details object, instead of passing the error as an argument
  - Dev defaults to `debug` level, prod defaults to `info`, use `LOG_LEVEL=info` env variable
  - Removed `alert` and `notice` levels
  - New `fatal` level above `error`
  - New `trace` level, below `debug`
- `Dir.txtFiles` renamed from `Dir.textFiles`, for consistency with other file types
- `JsonFileType` & `NdJsonFileType` no longer user the `snapshot` hack to stringify special objects. Will remove `snapshot` in the future.
- `FileTypeCsv`
  - Second argument changed from `keys` array to options object (`keys` can be provided as option)
  - Automatic parsing of numbers, booleans, and nulls can be disabled (`parseNumbers`, `parseBooleans`, `parseNulls`)
- Removed `@types/node` as peer dependency
- Added explicit return types for everything

## 0.15.1

- `Dir` uses YYYYMMDD as default name
- `File` uses YYYYMMDD-HHmmss as default name

## 0.15.0

- `TypeWriter` option for `outFile`, defaults to `[moduleName].types.ts`

# Development

Typecheck and run all tests from `*.test.ts` files

```
pnpm test
```

Format with Prettier, generate API docs for this Readme

```
pnpm run build
```

Release a new version

- runs test and build
- If no unstaged changes, creates a new commit with version tag (`preversion` script in package.json)
- Pushes to github (`postversion` script in package.json)
- Triggers github workflow that publishes to npm

```
pnpm version [patch|minor|major]
```
