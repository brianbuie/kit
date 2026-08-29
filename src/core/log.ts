import { isObjectLike } from 'lodash-es';
import { inspect } from 'loupe';
import { default as chalk, type ChalkInstance } from 'chalk';
import { snapshot } from './snapshot.ts';
import { Format } from './format.ts';
import { Env } from './env.ts';

const LogLevels = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  ALERT: 5,
} as const;

export type LogLevel = keyof typeof LogLevels;

type LogArgs = [string, unknown] | [unknown];

export type LogEntry = {
  message?: string;
  level: LogLevel;
  details?: unknown;
};

/**
 * Levels: TRACE, DEBUG, INFO, WARN, ERROR, ALERT.
 * Use `LOG_LEVL=INFO` to limit what's printed to console
 */
export class Log {
  static isProd = Env.isProd;
  static isGcloud = Env.isGcloud;
  static isBrowser = Env.isBrowser;
  static silent = false;
  static minLevel =
    Env.get('LOG_LEVEL') !== undefined ? (LogLevels[Env.get('LOG_LEVEL') as LogLevel] ?? 2) : Env.isProd ? 2 : 1;

  protected static toPretty = (entry: LogEntry): void => {
    const colors: Record<LogLevel, ChalkInstance> = {
      TRACE: chalk.gray,
      DEBUG: chalk.gray,
      INFO: chalk.white,
      WARN: chalk.yellow,
      ERROR: chalk.red,
      ALERT: chalk.bgRed,
    };
    if (entry.message) {
      console.log(colors[entry.level](`${Format.date('h:m:s')} [${entry.level}] ${entry.message || ''}`));
    }
    if (entry.details) {
      console.log(inspect(entry.details, { depth: 10, breakLength: 100, colors: true }));
    }
  };

  protected static toBrowser = ({ level, message, details }: LogEntry): void => {
    const LogLevelFn: Record<LogLevel, (...args: any[]) => void> = {
      TRACE: console.debug,
      DEBUG: console.debug,
      INFO: console.log,
      WARN: console.warn,
      ERROR: console.error,
      ALERT: console.error,
    };
    if (message && details) return LogLevelFn[level](message, details);
    if (message || details) LogLevelFn[level](message ?? details);
  };

  protected static toGcloud = ({ level, message, details }: LogEntry): void => {
    const GcloudSeverity = {
      TRACE: 'DEBUG',
      DEBUG: 'DEBUG',
      INFO: 'INFO',
      WARN: 'WARNING',
      ERROR: 'ERROR',
      ALERT: 'ALERT',
    } as const;
    console.log(JSON.stringify(snapshot({ message, details, severity: GcloudSeverity[level] })));
  };

  /**
   * Handle first argument being a string or an object with a 'message' or 'msg' prop
   */
  protected static parseInput = (level: LogLevel, [arg1, arg2]: LogArgs): LogEntry => {
    if (typeof arg1 === 'string') {
      return { level, message: arg1, details: arg2 };
    }
    if (isObjectLike(arg1) && !Array.isArray(arg1)) {
      const details = arg1 as { message?: string; msg?: string };
      return { level, message: details?.message || details?.msg, details };
    }
    return { level, details: arg1 };
  };

  protected static write = (level: LogLevel, input: LogArgs): void => {
    const entry = Log.parseInput(level, input);
    if (Log.silent || LogLevels[level] < Log.minLevel) return;
    if (Log.isBrowser) return Log.toBrowser(entry);
    if (Log.isGcloud) return Log.toGcloud(entry);
    if (!Log.isProd) return Log.toPretty(entry);
    console.log(JSON.stringify(entry));
  };

  /**
   * trace information (never logged in gcloud)
   */
  static trace = (...input: LogArgs): void => Log.write('TRACE', input);

  /**
   * Debug info (only logged in development)
   */
  static debug = (...input: LogArgs): void => Log.write('DEBUG', input);

  /**
   * Routine information, such as ongoing status or performance
   */
  static info = (...input: LogArgs): void => Log.write('INFO', input);

  /**
   * Events that might cause problems
   */
  static warn = (...input: LogArgs): void => Log.write('WARN', input);

  /**
   * Events that cause problems
   */
  static error = (...input: LogArgs): void => Log.write('ERROR', input);

  /**
   * Events that require action or attention immediately.
   */
  static alert = (...input: LogArgs): void => Log.write('ALERT', input);
}
