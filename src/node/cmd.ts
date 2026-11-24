import { spawn, execFileSync, type SpawnOptionsWithoutStdio } from 'child_process';
import { createInterface } from 'readline/promises';
import { parseArgsStringToArgv as parseArgs } from 'string-argv';
import merge from 'lodash-es/merge.js';
import flattenDeep from 'lodash-es/flattenDeep.js';

export type CmdArgs = string | (string | number | null | undefined | CmdArgs)[];

/**
 * Spawn a child process for shell commands with `Cmd.run('command arg1=something arg2=2...")`
 * @param args can be provided as a string or array of strings
 * @returns Promise that resolves with content of STDOUT. Rejects with output of STDERR
 */
export class Cmd {
  static args = (args: CmdArgs): string[] => {
    return typeof args === 'string'
      ? parseArgs(args)
      : parseArgs(
          flattenDeep(args)
            .filter(a => a !== undefined)
            .join(' '),
        );
  };

  /**
   * Spawn a child process attached to the current process's stdin/stdout/stderr, for interactive commands.
   * @returns Promise that resolves with the exit code. Rejects if the process fails to spawn or is killed by a signal.
   */
  static pipe = async (cmd: string, args: CmdArgs, opts?: SpawnOptionsWithoutStdio): Promise<number> => {
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, this.args(args), { ...opts, stdio: 'inherit' });
      child.on('error', reject);
      child.on('close', (code, signal) => {
        if (signal) return reject(new Error(`${cmd} terminated by ${signal}`));
        resolve(code ?? 0);
      });
    });
  };

  /**
   * Prompt for a secret value, like password. Temporarily disables echo at the TTY level, to trigger password manager in iTerm2.
   * SIGINT (Ctrl+C) will exit prompt without exiting process. Be sure to handle empty output.
   */
  static promptSecret = async (prompt: string) => {
    const stty = (...args: string[]): string =>
      execFileSync('stty', args, {
        stdio: ['inherit', 'pipe', 'inherit'],
        encoding: 'utf8',
      }).trim();
    const original = stty('-g');
    const rl = createInterface({
      input: process.stdin,
      terminal: false,
    });
    const controller = new AbortController();
    const onInterrupt = () => controller.abort();
    process.once('SIGINT', onInterrupt);
    try {
      stty('-echo');
      process.stdout.write(prompt);
      return await rl.question('', {
        signal: controller.signal,
      });
    } finally {
      stty(original);
      rl.close();
      process.removeListener('SIGINT', onInterrupt);
      process.stdout.write('\n');
    }
  };

  /**
   * Spawn child process. If command doesn't include "/", `this.bin` path will be added to the beginning of it.
   */
  static run = async (cmd: string, args: CmdArgs, opts?: SpawnOptionsWithoutStdio): Promise<string> => {
    const options = merge({ timeout: 5 * 60 * 1000 }, opts);
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      const child = spawn(cmd, this.args(args), options);
      child.stdout.on('data', chunk => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', chunk => {
        stderr += chunk.toString();
      });
      child.on('close', () => {
        const err = stderr.trim();
        if (err.length) return reject(new Error(stderr));
        resolve(stdout.trim());
      });
    });
  };

  /**
   * Run ffmpeg for video processing (ffmpeg needs to be installed separately). ffmpeg location should be in $PATH or `FFMPEG_PATH` environment variable.
   */
  static ffmpeg = async (args: CmdArgs) => {
    const cmd = process.env.FFMPEG_PATH || 'ffmpeg';
    return this.run(cmd, ['-y', '-loglevel', 'error', args], { timeout: 10 * 60 * 1000 });
  };

  /**
   * Use ffprobe to get video stream dimensions (ffprobe needs to be installed separately). ffprobe location should be in $PATH or `FFPROBE_PATH` environment variable.
   */
  static ffprobe = async (args: CmdArgs) => {
    const cmd = process.env.FFPROBE_PATH || 'ffprobe';
    return this.run(cmd, ['-v', 'error', args], { timeout: 10 * 60 * 1000 });
  };
}
