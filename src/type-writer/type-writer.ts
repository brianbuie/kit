import * as fs from 'node:fs';
import { merge } from 'lodash-es';
import * as qt from 'quicktype-core';

/**
 * IMPORTANT: [quicktype-core](https://github.com/glideapps/quicktype) needs to be installed in the project.
 * @example
 * import { TypeWriter } from '@brianbuie/kit/TypeWriter'
 * const group = new TypeWriter('Group');
 * await types.addMember('Thing', [{ a: 1 }, { a: 2, b: 1 }]);
 * await types.toFile();
 * // type def for `Thing` saved in `types/Group.types.ts`
 */
export class TypeWriter {
  moduleName: string;
  input = qt.jsonInputForTargetLanguage('typescript');
  outDir: string;
  outFile: string;
  qtSettings: Partial<qt.Options>;

  constructor(moduleName: string, settings: { outDir?: string; outFile?: string } & Partial<qt.Options> = {}) {
    this.moduleName = moduleName;
    const { outDir, outFile, ...qtSettings } = settings;
    this.outDir = outDir || './types';
    this.outFile = outFile || `${this.moduleName}.types.ts`;
    const defaultSettings = {
      lang: 'typescript',
      rendererOptions: {
        'just-types': true,
        'prefer-types': true,
      },
      inferEnums: false,
      inferDateTimes: false,
    };
    this.qtSettings = merge(defaultSettings, qtSettings);
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
      ...this.qtSettings,
    });
    return result.lines.join('\n');
  };

  toFile = async (): Promise<void> => {
    const result = await this.toString();
    fs.mkdirSync(this.outDir, { recursive: true });
    fs.writeFileSync(`${this.outDir}/${this.outFile}`, result);
  };
}
