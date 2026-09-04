import { temp } from './dir.ts';

/**
 * Runs once before the entire test suite (see vitest.config.ts `globalSetup`).
 * Individual test files should NOT call `Dir.clear()` on shared temp roots themselves -
 * one controlled clear here is safer than many scattered calls across test files.
 */
export default async function setup() {
  await temp.clear();
}
