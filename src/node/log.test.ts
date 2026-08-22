import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { Log } from './log.ts';

describe('Log', () => {
  const originalIsProd = Log.isProd;
  const originalIsGcloud = Log.isGcloud;
  const originalSilent = Log.silent;
  const originalLogLevel = process.env.LOG_LEVEL;
  let logSpy: ReturnType<typeof mock.method<Console, 'log'>>;

  beforeEach(() => {
    logSpy = mock.method(console, 'log', () => {});
    Log.isProd = false;
    Log.isGcloud = false;
    Log.silent = false;
    delete process.env.LOG_LEVEL;
  });

  afterEach(() => {
    mock.restoreAll();
    Log.isProd = originalIsProd;
    Log.isGcloud = originalIsGcloud;
    Log.silent = originalSilent;
    if (originalLogLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLogLevel;
    }
  });

  describe('level filtering', () => {
    it('logs DEBUG and above, but not TRACE, in development', () => {
      Log.trace('trace');
      assert.equal(logSpy.mock.callCount(), 0);
      Log.debug('debug');
      Log.info('info');
      Log.warn('warn');
      Log.error('error');
      Log.alert('alert');
      assert.equal(logSpy.mock.callCount(), 5);
    });

    it('logs INFO and above, but not TRACE or DEBUG, in production', () => {
      Log.isProd = true;
      Log.trace('trace');
      Log.debug('debug');
      assert.equal(logSpy.mock.callCount(), 0);
      Log.info('info');
      Log.warn('warn');
      Log.error('error');
      Log.alert('alert');
      assert.equal(logSpy.mock.callCount(), 4);
    });

    it('respects LOG_LEVEL override regardless of isProd', () => {
      process.env.LOG_LEVEL = 'ERROR';
      Log.isProd = false;
      Log.debug('debug');
      Log.info('info');
      Log.warn('warn');
      assert.equal(logSpy.mock.callCount(), 0);
      Log.error('error');
      Log.alert('alert');
      assert.equal(logSpy.mock.callCount(), 2);
    });

    it('logs nothing when silent', () => {
      Log.silent = true;
      Log.info('info');
      Log.error('error');
      Log.alert('alert');
      assert.equal(logSpy.mock.callCount(), 0);
    });
  });

  describe('gcloud output', () => {
    beforeEach(() => {
      Log.isGcloud = true;
    });

    it('stringifies entries as JSON', () => {
      Log.info('hello', { num: 1 });
      const parsed = JSON.parse(logSpy.mock.calls[0].arguments[0] as string);
      assert.equal(parsed.message, 'hello');
      assert.deepEqual(parsed.details, { num: 1 });
    });

    it('maps severities to gcloud LogSeverity values', () => {
      Log.debug('debug');
      Log.info('info');
      Log.warn('warn');
      Log.error('error');
      Log.alert('alert');
      const severities = logSpy.mock.calls.map(call => JSON.parse(call.arguments[0] as string).severity);
      assert.deepEqual(severities, ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'ALERT']);
    });

    it('accepts a message string with optional details', () => {
      Log.info('message', { foo: 'bar' });
      const parsed = JSON.parse(logSpy.mock.calls[0].arguments[0] as string);
      assert.equal(parsed.message, 'message');
      assert.deepEqual(parsed.details, { foo: 'bar' });
    });

    it('pulls message/msg from an object argument', () => {
      Log.info({ message: 'from message' });
      Log.info({ msg: 'from msg' });
      const [first, second] = logSpy.mock.calls.map(call => JSON.parse(call.arguments[0] as string));
      assert.equal(first.message, 'from message');
      assert.equal(second.message, 'from msg');
    });

    it('treats non-object first args as details with no message', () => {
      Log.info(42);
      const parsed = JSON.parse(logSpy.mock.calls[0].arguments[0] as string);
      assert.equal(parsed.message, undefined);
      assert.equal(parsed.details, 42);
    });
  });
});
