import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  execFileSync: vi.fn(),
  createInterface: vi.fn(),
  question: vi.fn(),
  close: vi.fn(),
}));

vi.mock('child_process', () => ({
  execFileSync: mocks.execFileSync,
  spawn: vi.fn(),
}));

vi.mock('readline/promises', () => ({
  createInterface: mocks.createInterface,
}));

import { Cmd } from './cmd.ts';

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
