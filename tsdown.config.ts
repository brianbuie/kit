import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    // cross-platform parts
    entry: { core: 'src/core/_index.ts' },
    platform: 'neutral',
    dts: { sourcemap: true },
  },
  {
    // node.js parts and core exports
    entry: { node: 'src/node/_index.ts' },
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
