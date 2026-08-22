import { spawn, type SpawnOptionsWithoutStdio } from 'child_process';
import { parseArgsStringToArgv as parseArgs } from 'string-argv';
import { merge, flattenDeep } from 'lodash-es';

export type CmdArgs = string | (string | number | null | undefined | CmdArgs)[];

/**
 * Spawn a child process for shell commands with `Cmd.run('command arg1=something arg2=2...")`
 * @param args can be provided as a string or array of strings
 * @returns Promise that resolves with content of STDOUT. Rejects with output of STDERR
 */
export class Cmd {
  static bin = '/usr/local/bin';

  /**
   * configure global location of bin files
   */
  static configure = ({ bin }: { bin: string }): void => {
    this.bin = bin;
  };

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
   * Spawn child process. If command doesn't include "/", `this.bin` path will be added to the beginning of it.
   */
  static run = async (cmd: string, args: CmdArgs, opts?: SpawnOptionsWithoutStdio): Promise<string> => {
    const options = merge({ timeout: 5 * 60 * 1000 }, opts);
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      const command = cmd.includes('/') ? cmd : `${this.bin}/${cmd}`;
      const child = spawn(command, this.args(args), options);
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
   * Run ffmpeg for video processing (ffmpeg needs to be installed separately). Specify ffmpeg location with `FFMPEG_PATH` environment variable.
   */
  static ffmpeg = async (args: CmdArgs) => {
    const cmd = process.env.FFMPEG_PATH || 'ffmpeg';
    return this.run(cmd, ['-y', '-loglevel', 'error', args], { timeout: 10 * 60 * 1000 });
  };

  /**
   * Use ffprobe to get video stream dimensions (ffprobe needs to be installed separately). Specify ffmpeg location with `FFPROBE_PATH` environment variable.
   */
  static ffprobe = async (args: CmdArgs) => {
    const cmd = process.env.FFPROBE_PATH || 'ffprobe';
    return this.run(cmd, ['-v', 'error', args], { timeout: 10 * 60 * 1000 });
  };
}
