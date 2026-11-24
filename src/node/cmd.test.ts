import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';

const mocks = vi.hoisted(() => ({
  execFileSync: vi.fn(),
  spawn: vi.fn(),
  createInterface: vi.fn(),
  question: vi.fn(),
  close: vi.fn(),
}));

vi.mock('child_process', () => ({
  execFileSync: mocks.execFileSync,
  spawn: mocks.spawn,
}));

vi.mock('readline/promises', () => ({
  createInterface: mocks.createInterface,
}));

import { Cmd } from './cmd.ts';

describe('Cmd command execution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(['capture', 'run'] as const)(
    '%s captures stdout with the existing options and error behavior',
    async method => {
      const child = Object.assign(new EventEmitter(), {
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
      });
      mocks.spawn.mockReturnValue(child);
      const result = Cmd[method]('git', ['--version'], { cwd: '/example' });
      expect(mocks.spawn).toHaveBeenCalledWith('git', ['--version'], { cwd: '/example', timeout: 300000 });
      child.stdout.emit('data', Buffer.from(' version \n'));
      child.emit('close', 1, null);
      await expect(result).resolves.toBe('version');

      const failedChild = Object.assign(new EventEmitter(), {
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
      });
      mocks.spawn.mockReturnValue(failedChild);
      const failure = Cmd[method]('git', []);
      failedChild.stderr.emit('data', Buffer.from('warning\n'));
      failedChild.emit('close', 0, null);
      await expect(failure).rejects.toThrow('warning');
    },
  );

  it('pipe inherits stdio and returns the exit code', async () => {
    const child = new EventEmitter();
    mocks.spawn.mockReturnValue(child);
    const result = Cmd.pipe('git', ['add', '-p'], { cwd: '/example' });
    expect(mocks.spawn).toHaveBeenCalledWith('git', ['add', '-p'], { cwd: '/example', stdio: 'inherit' });
    child.emit('close', 2, null);
    await expect(result).resolves.toBe(2);
  });

  it('pipe rejects when the process is terminated by a signal', async () => {
    const child = new EventEmitter();
    mocks.spawn.mockReturnValue(child);
    const result = Cmd.pipe('git', []);
    child.emit('close', null, 'SIGTERM');
    await expect(result).rejects.toThrow('git terminated by SIGTERM');
  });

  it('pipe rejects when spawning fails', async () => {
    const child = new EventEmitter();
    mocks.spawn.mockReturnValue(child);
    const result = Cmd.pipe('missing-command', []);
    child.emit('error', new Error('spawn failed'));
    await expect(result).rejects.toThrow('spawn failed');
  });
});

describe('Cmd.promptSecret', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.execFileSync.mockReturnValue('');
    mocks.execFileSync.mockReturnValueOnce('original-state');
    mocks.createInterface.mockReturnValue({
      question: mocks.question,
      close: mocks.close,
    });
  });

  it('disables terminal echo while prompting and restores the original terminal state', async () => {
    mocks.question.mockResolvedValue('secret');
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    await expect(Cmd.promptSecret('Password: ')).resolves.toBe('secret');

    expect(mocks.execFileSync.mock.calls.map(([, args]) => args)).toEqual([['-g'], ['-echo'], ['original-state']]);
    expect(mocks.createInterface).toHaveBeenCalledWith({
      input: process.stdin,
      terminal: false,
    });
    expect(mocks.question).toHaveBeenCalledWith('', {
      signal: expect.any(AbortSignal),
    });
    expect(write.mock.calls.map(([text]) => text)).toEqual(['Password: ', '\n']);
    expect(mocks.close).toHaveBeenCalledOnce();
  });

  it('restores terminal state and cleans up when interrupted with SIGINT', async () => {
    mocks.question.mockImplementation(
      (_prompt: string, { signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        }),
    );
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const interruptListeners = process.listenerCount('SIGINT');
    const prompt = Cmd.promptSecret('Password: ');

    process.emit('SIGINT');

    await expect(prompt).rejects.toMatchObject({ name: 'AbortError' });

    expect(mocks.execFileSync.mock.calls.map(([, args]) => args)).toEqual([['-g'], ['-echo'], ['original-state']]);
    expect(write.mock.calls.map(([text]) => text)).toEqual(['Password: ', '\n']);
    expect(mocks.close).toHaveBeenCalledOnce();
    expect(process.listenerCount('SIGINT')).toBe(interruptListeners);
  });
});
