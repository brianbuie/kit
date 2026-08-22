import { inspect } from 'node:util';
import { isObjectLike } from 'lodash-es';
import chalk, { type ChalkInstance } from 'chalk';
import { snapshot } from '../core/snapshot.ts';
import { Format } from '../core/format.ts';

/**
 * Loosely based on Google's [LogSeverity](https://docs.cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#logseverity),
 * without some of the redundant severe levels.
 */
const Level = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  ALERT: 5,
};

type Severity = keyof typeof Level;

const GcloudLevelMap = {
  TRACE: 'DEBUG',
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARNING',
  ERROR: 'ERROR',
  ALERT: 'ALERT',
} as const;

type LogArgs = [string, unknown] | [unknown];

type LogEntry = {
  message?: string;
  severity: Severity;
  stack?: string;
  details?: unknown;
};

type Options = {
  severity: Severity;
  color: ChalkInstance;
};

/**
 * Levels: TRACE, DEBUG, INFO, WARN, ERROR, ALERT.
 * Use `LOG_LEVL=INFO` to limit what's printed to console
 */
export class Log {
  static isProd = process.env.NODE_ENV === 'production';
  /**
   * These env variables should be set automatically in Google Cloud Run.
   * https://cloud.google.com/run/docs/container-contract#env-vars
   */
  static isGcloud = process.env.K_SERVICE !== undefined || process.env.CLOUD_RUN_JOB !== undefined;
  static silent = false;

  /**
   * Gcloud parses JSON in stdout
   */
  static #logGcloud = (entry: LogEntry): void => {
    const severity = GcloudLevelMap[entry.severity];
    console.log(JSON.stringify(snapshot({ ...entry, severity })));
  };

  /**
   * Includes colors and better inspection for logging during dev
   */
  static #logPretty = (entry: LogEntry, color: ChalkInstance): void => {
    if (entry.message) console.log(color(`${Format.date('h:m:s')} [${entry.severity}] ${entry.message}`));
    if (entry.details)
      console.log(inspect(entry.details, { depth: 10, breakLength: 100, compact: true, colors: true }));
  };

  /**
   * Handle first argument being a string or an object with a 'message' or 'msg' prop
   */
  static #prepare = ([arg1, arg2]: LogArgs): Omit<LogEntry, 'severity'> => {
    if (typeof arg1 === 'string') {
      return { message: arg1, details: arg2 };
    }
    if (isObjectLike(arg1) && !Array.isArray(arg1)) {
      const details = arg1 as { message?: string; msg?: string };
      return { message: details?.message || details?.msg, details };
    }
    return { details: arg1 };
  };

  static #shouldLog = (entry: LogEntry): boolean => {
    if (this.silent) return false;
    const env = process.env.LOG_LEVEL as Severity;
    const min = Level[env] ?? (this.isProd ? 2 : 1);
    return Level[entry.severity] >= min;
  };

  static #log = ({ severity, color }: Options, input: LogArgs): void => {
    const { message, details } = this.#prepare(input);
    const entry: LogEntry = { message, severity, details };
    if (!this.#shouldLog(entry)) return;
    if (this.isGcloud) {
      this.#logGcloud(entry);
    } else {
      this.#logPretty(entry, color);
    }
  };

  /**
   * trace information (never logged in gcloud)
   */
  static trace = (...input: LogArgs): void => this.#log({ severity: 'TRACE', color: chalk.gray }, input);

  /**
   * Debug info (only logged in development)
   */
  static debug = (...input: LogArgs): void => this.#log({ severity: 'DEBUG', color: chalk.gray }, input);

  /**
   * Routine information, such as ongoing status or performance
   */
  static info = (...input: LogArgs): void => this.#log({ severity: 'INFO', color: chalk.white }, input);

  /**
   * Events that might cause problems
   */
  static warn = (...input: LogArgs): void => this.#log({ severity: 'WARN', color: chalk.yellow }, input);

  /**
   * Events that cause problems
   */
  static error = (...input: LogArgs): void => this.#log({ severity: 'ERROR', color: chalk.red }, input);

  /**
   * Events that require action or attention immediately.
   */
  static alert = (...input: LogArgs): void => this.#log({ severity: 'ALERT', color: chalk.bgRed }, input);
}
