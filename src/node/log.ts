import { inspect } from 'node:util';
import chalk, { type ChalkInstance } from 'chalk';
import { Log as LogCore, type LogLevel, type LogEntry } from '../core/log.ts';

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
export class Log extends LogCore {
  protected static prettyMessage = (entry: LogEntry): string => {
    return colors[entry.level](super.prettyMessage(entry));
  };

  protected static prettyDetails = ({ details }: LogEntry): string => {
    return inspect(details, { depth: 10, breakLength: 100, compact: true, colors: true });
  };
}
