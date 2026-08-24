import { describe, it, afterEach, assert } from 'vitest';
import { Env } from './env.ts';

describe('Env', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCloudRunService = process.env.K_SERVICE;
  const originalCloudRunJob = process.env.CLOUD_RUN_JOB;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalCloudRunService === undefined) delete process.env.K_SERVICE;
    else process.env.K_SERVICE = originalCloudRunService;
    if (originalCloudRunJob === undefined) delete process.env.CLOUD_RUN_JOB;
    else process.env.CLOUD_RUN_JOB = originalCloudRunJob;
    delete (globalThis as { window?: unknown }).window;
  });

  it('reads environment variables dynamically', () => {
    process.env.TEST_ENV_VALUE = 'value';
    assert.equal(Env.get('TEST_ENV_VALUE'), 'value');
    delete process.env.TEST_ENV_VALUE;
    assert.equal(Env.get('TEST_ENV_VALUE'), undefined);
  });

  it('requires environment variables when requested', () => {
    process.env.TEST_REQUIRED_ENV_VALUE = 'value';
    const value: string = Env.need('TEST_REQUIRED_ENV_VALUE');
    assert.equal(value, 'value');

    delete process.env.TEST_REQUIRED_ENV_VALUE;
    assert.throws(() => Env.need('TEST_REQUIRED_ENV_VALUE'));
  });

  it('detects production mode dynamically', () => {
    process.env.NODE_ENV = 'production';
    assert.equal(Env.isProd, true);
    process.env.NODE_ENV = 'development';
    assert.equal(Env.isProd, false);
  });

  it('detects Cloud Run services and jobs', () => {
    delete process.env.K_SERVICE;
    delete process.env.CLOUD_RUN_JOB;
    assert.equal(Env.isGcloud, false);
    process.env.K_SERVICE = 'service';
    assert.equal(Env.isGcloud, true);
    delete process.env.K_SERVICE;
    process.env.CLOUD_RUN_JOB = 'job';
    assert.equal(Env.isGcloud, true);
  });

  it('detects browser globals', () => {
    const browserWindow = {};
    (globalThis as { window?: unknown }).window = browserWindow;
    assert.equal(Env.isBrowser, true);
    assert.equal(Env.window, browserWindow);
    delete (globalThis as { window?: unknown }).window;
    assert.equal(Env.isBrowser, false);
    assert.equal(Env.window, undefined);
  });
});
