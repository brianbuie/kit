import { resolve, join } from 'node:path';
import { Env } from '../core/_index.ts';

export class Path {
  protected input;
  resolved;

  constructor(p: string, from = process.cwd()) {
    this.input = p;
    this.resolved = resolve(from, p.startsWith('~') ? p.replace('~', Env.need('HOME')) : p);
  }

  get segments() {
    return this.resolved.split('/').filter(s => s.length > 0);
  }

  join(add: string) {
    return join(this.resolved, add);
  }

  canDelete() {
    if (!this.segments.length) {
      throw new Error('Path is root');
    }
    if (!this.segments.some(s => s.length > 1 && s.startsWith('.'))) {
      throw new Error("Path doesn't have a segment starting with '.'");
    }
  }
}
