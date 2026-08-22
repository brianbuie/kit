import { isObjectLike } from 'lodash-es';
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

const LogLevelFn: Record<LogLevel, (...args: any[]) => void> = {
  TRACE: console.debug,
  DEBUG: console.debug,
  INFO: console.log,
  WARN: console.warn,
  ERROR: console.error,
  ALERT: console.error,
};

const GcloudSeverity = {
  TRACE: 'DEBUG',
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARNING',
  ERROR: 'ERROR',
  ALERT: 'ALERT',
} as const;

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
    Env.var('LOG_LEVEL') !== undefined ? LogLevels[Env.var('LOG_LEVEL') as LogLevel] : Env.isProd ? 2 : 1;

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

  protected static toBrowser = ({ level, message, details }: LogEntry): void => {
    if (message && details) return LogLevelFn[level](message, details);
    if (message || details) LogLevelFn[level](message ?? details);
  };

  protected static toGcloud = ({ level, message, details }: LogEntry): void => {
    console.log(JSON.stringify(snapshot({ message, details, severity: GcloudSeverity[level] })));
  };

  protected static prettyMessage = ({ level, message }: LogEntry): string => {
    return `${Format.date('h:m:s')} [${level}] ${message || ''}`;
  };

  protected static prettyDetails = ({ details }: LogEntry) => {
    return JSON.stringify(details, null, 2);
  };

  protected static toPretty = (entry: LogEntry): void => {
    if (entry.message) console.log(this.prettyMessage(entry));
    if (entry.details) console.log(this.prettyDetails(entry));
  };

  protected static write = (level: LogLevel, input: LogArgs): void => {
    const entry = this.parseInput(level, input);
    if (this.silent || LogLevels[level] < this.minLevel) return;
    if (this.isBrowser) return this.toBrowser(entry);
    if (this.isGcloud) return this.toGcloud(entry);
    if (!this.isProd) return this.toPretty(entry);
    console.log(JSON.stringify(entry));
  };

  /**
   * trace information (never logged in gcloud)
   */
  static trace = (...input: LogArgs): void => this.write('TRACE', input);

  /**
   * Debug info (only logged in development)
   */
  static debug = (...input: LogArgs): void => this.write('DEBUG', input);

  /**
   * Routine information, such as ongoing status or performance
   */
  static info = (...input: LogArgs): void => this.write('INFO', input);

  /**
   * Events that might cause problems
   */
  static warn = (...input: LogArgs): void => this.write('WARN', input);

  /**
   * Events that cause problems
   */
  static error = (...input: LogArgs): void => this.write('ERROR', input);

  /**
   * Events that require action or attention immediately.
   */
  static alert = (...input: LogArgs): void => this.write('ALERT', input);
}
