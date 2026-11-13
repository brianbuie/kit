import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    // cross-platform parts
    entry: {
      core: 'src/core/_index.ts',
      'core/cache': 'src/core/cache.ts',
      env: 'src/core/env.ts',
      fetcher: 'src/core/fetcher.ts',
      format: 'src/core/format.ts',
      log: 'src/core/log.ts',
      snapshot: 'src/core/snapshot.ts',
      store: 'src/core/store.ts',
      timeout: 'src/core/timeout.ts',
    },
    platform: 'neutral',
    dts: { sourcemap: true },
  },
  {
    // node.js parts and core exports
    entry: {
      node: 'src/node/_index.ts',
      cache: 'src/node/cache.ts',
      cmd: 'src/node/cmd.ts',
      dir: 'src/node/dir.ts',
      file: 'src/node/file.ts',
      path: 'src/node/path.ts',
    },
    platform: 'node',
    dts: { sourcemap: true },
  },
  {
    // isolated because of the optional quicktype-core peer dep
    entry: { 'type-writer': 'src/type-writer/_index.ts' },
    platform: 'node',
    dts: { sourcemap: true },
  },
]);
