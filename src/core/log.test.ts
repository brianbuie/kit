import { describe, it, beforeEach, afterEach, assert, vi, type MockInstance } from 'vitest';
import { Log } from './log.ts';

describe('Log', () => {
  let logSpy: MockInstance;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    Log.isProd = false;
    Log.isGcloud = false;
    Log.isBrowser = false;
    Log.silent = false;
    Log.minLevel = 1;
  });

  afterEach(() => vi.restoreAllMocks());

  it('pretty prints messages and details in development', () => {
    Log.info('hello', { answer: 42 });

    assert.equal(logSpy.mock.calls.length, 2);
    assert.match(logSpy.mock.calls[0][0] as string, /\[INFO\] hello/);
    assert.equal(logSpy.mock.calls[1][0], '{\n  "answer": 42\n}');
  });

  it('writes structured JSON in production', () => {
    Log.isProd = true;
    Log.warn({ msg: 'warning', count: 2 });

    const entry = JSON.parse(logSpy.mock.calls[0][0] as string);
    assert.equal(entry.level, 'WARN');
    assert.equal(entry.message, 'warning');
    assert.deepEqual(entry.details, { msg: 'warning', count: 2 });
  });

  it('writes gcloud severity and details', () => {
    Log.isGcloud = true;
    Log.error('failure', { code: 500 });

    const entry = JSON.parse(logSpy.mock.calls[0][0] as string);
    assert.equal(entry.severity, 'ERROR');
    assert.equal(entry.message, 'failure');
    assert.deepEqual(entry.details, { code: 500 });
  });

  it('filters levels below the configured minimum', () => {
    Log.minLevel = 4;
    Log.debug('debug');
    Log.info('info');
    Log.error('error');

    assert.equal(logSpy.mock.calls.length, 1);
    assert.match(logSpy.mock.calls[0][0] as string, /\[ERROR\] error/);
  });

  it('uses the production threshold when configured', () => {
    Log.isProd = true;
    Log.minLevel = 2;
    Log.trace('trace');
    Log.debug('debug');
    Log.info('info');

    assert.equal(logSpy.mock.calls.length, 1);
    const entry = JSON.parse(logSpy.mock.calls[0][0] as string);
    assert.equal(entry.level, 'INFO');
  });

  it('logs nothing when silent', () => {
    Log.silent = true;
    Log.info('info');
    Log.error('error');

    assert.equal(logSpy.mock.calls.length, 0);
  });

  describe('gcloud output', () => {
    beforeEach(() => {
      Log.isGcloud = true;
    });

    it('maps all levels to Gcloud severities', () => {
      Log.debug('debug');
      Log.info('info');
      Log.warn('warn');
      Log.error('error');
      Log.alert('alert');

      const severities = logSpy.mock.calls.map(call => JSON.parse(call[0] as string).severity);
      assert.deepEqual(severities, ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'ALERT']);
    });

    it('pulls message and msg from object arguments', () => {
      Log.info({ message: 'from message' });
      Log.info({ msg: 'from msg' });

      const entries = logSpy.mock.calls.map(call => JSON.parse(call[0] as string));
      assert.equal(entries[0].message, 'from message');
      assert.equal(entries[1].message, 'from msg');
    });

    it('treats non-object arguments as details', () => {
      Log.info(42);

      const entry = JSON.parse(logSpy.mock.calls[0][0] as string);
      assert.equal(entry.message, undefined);
      assert.equal(entry.details, 42);
    });
  });

  it('allows methods to be passed to Promise.catch', async () => {
    Log.isGcloud = true;

    await Promise.reject(new Error('example')).catch(Log.warn);

    const entry = JSON.parse(logSpy.mock.calls[0][0] as string);
    assert.equal(entry.severity, 'WARNING');
    assert.equal(entry.message, 'example');
  });
});
