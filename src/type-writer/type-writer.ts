import { merge } from 'lodash-es';
import * as qt from 'quicktype-core';
import { File, cwd } from '../node/_index.ts';

/**
 * IMPORTANT: [quicktype-core](https://github.com/glideapps/quicktype) needs to be installed in the project.
 * @example
 * import { TypeWriter } from '@brianbuie/kit/TypeWriter'
 * const group = new TypeWriter('src/group.types.ts');
 * await types.addMember('Thing', [{ a: 1 }, { a: 2, b: 1 }]);
 * await types.toFile();
 * // type def for `Thing` saved in `./src/group.types.ts`
 */
export class TypeWriter {
  file;
  settings;
  input = qt.jsonInputForTargetLanguage('typescript');

  constructor(filepath: string, settings: Partial<qt.Options> = {}) {
    this.file = new File(filepath);
    if (this.file.ext !== '.ts') {
      throw new Error(`TypeWriter: output path is not a .ts file. (${this.file.path})`);
    }
    if (!this.file.path.includes(cwd.path)) {
      throw new Error(`TypeWriter: output path is outside of the current working directory. (${this.file.path})`);
    }
    const defaultSettings = {
      lang: 'typescript',
      rendererOptions: {
        'just-types': true,
        'prefer-types': true,
      },
      inferEnums: false,
      inferDateTimes: false,
    };
    this.settings = merge(defaultSettings, settings);
  }

  addMember = async (name: string, _samples: any[]): Promise<void> => {
    const samples = _samples.map(s => (typeof s === 'string' ? s : JSON.stringify(s)));
    await this.input.addSource({ name, samples });
  };

  toString = async (): Promise<string> => {
    const inputData = new qt.InputData();
    inputData.addInput(this.input);
    const result = await qt.quicktype({
      inputData,
      ...this.settings,
    });
    return result.lines.join('\n');
  };

  toFile = async (): Promise<void> => {
    const result = await this.toString();
    this.file.writeText(result);
  };
}
