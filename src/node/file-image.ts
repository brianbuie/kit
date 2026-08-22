import probeImageSize from 'probe-image-size';
import { FileBase } from './file-base.ts';

export type ImageDimensions = {
  width: number;
  height: number;
};

export class FileImage extends FileBase {
  dimensions = async (): Promise<ImageDimensions> => probeImageSize(this.readable);
}
