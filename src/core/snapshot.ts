import { isObjectLike } from 'lodash-es';

/**
 * Allows special objects (Error, Headers, Set) to be included in JSON.stringify output. Functions are removed.
 * ⚠️ Should only be used for logging and debugging!
 */
export const snapshot = (i: unknown, max = 50, depth = 0): any => {
  if (Array.isArray(i)) {
    if (depth === max) return [];
    return i.map(c => snapshot(c, max, depth + 1));
  }
  if (typeof i === 'function') return undefined;
  if (!isObjectLike(i)) return i;

  if (depth === max) return {};
  let output: Record<string, any> = {};
  // @ts-ignore If it has an 'entries' function, use that for looping (eg. Set, Map, Headers)
  if (typeof i.entries === 'function') {
    // @ts-ignore
    for (let [k, v] of i.entries()) {
      output[k] = snapshot(v, max, depth + 1);
    }
    return output;
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Enumerability_and_ownership_of_properties

  // Get Enumerable, inherited properties
  const obj: Record<string, any> = i!;
  for (let key in obj) {
    output[key] = snapshot(obj[key], max, depth + 1);
  }

  // Get Non-enumberable, own properties
  Object.getOwnPropertyNames(obj).forEach(key => {
    output[key] = snapshot(obj[key], max, depth + 1);
  });

  return output;
};
