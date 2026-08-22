import { Cmd } from './cmd.ts';
import { FileBase } from './file-base.ts';

export type VideoDimensions = {
  width: number;
  height: number;
  duration: number;
};

export class FileVideo extends FileBase {
  dimensions = async (): Promise<VideoDimensions> => {
    const out = await Cmd.ffprobe(`-select_streams v:0 -show_entries stream -of json "${this.path}"`);
    const { streams } = JSON.parse(out) as {
      streams: { width: number; height: number; duration: string }[];
    };
    if (!streams[0]) throw new Error('Could not parse video stream');
    return { ...streams[0], duration: Number(streams[0].duration) };
  };
}
