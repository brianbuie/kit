import { inspect } from 'node:util';
import chalk, { type ChalkInstance } from 'chalk';
import { Log as LogCore, type LogLevel, type LogEntry } from '../core/log.ts';
import { Format } from '../core/format.ts';

const colors: Record<LogLevel, ChalkInstance> = {
  TRACE: chalk.gray,
  DEBUG: chalk.gray,
  INFO: chalk.white,
  WARN: chalk.yellow,
  ERROR: chalk.red,
  ALERT: chalk.bgRed,
};

/**
 * Levels: TRACE, DEBUG, INFO, WARN, ERROR, ALERT.
 * Use `LOG_LEVL=INFO` to limit what's printed to console
 */
LogCore.formatters = {
  prettyMessage: (entry: LogEntry): string =>
    colors[entry.level](Format.date('h:m:s') + ` [${entry.level}] ${entry.message || ''}`),
  prettyDetails: ({ details }: LogEntry): string =>
    inspect(details, { depth: 10, breakLength: 100, compact: true, colors: true }),
};

export const Log = LogCore;
