import { describe, it, assert } from 'vitest';
import { TypeWriter } from './type-writer.ts';

describe('TypeWriter', () => {
  const test = new TypeWriter('src/type-writer/test.types.ts');

  it('Requires output path to be a .ts file', () => {
    assert.throws(() => new TypeWriter('src/type-writer/test.types.js'));
  });

  it('Requires output path to be inside the current working directory', () => {
    assert.throws(() => new TypeWriter('/tmp/type-writer.types.ts'));
  });

  it('Creates expected types', async () => {
    await test.addMember('Member', [
      {
        str: 'example string',
        num: 2,
        bool: true,
      },
    ]);
    const output = await test.toString();
    assert(/str:\s+string/.test(output));
    assert(/num:\s+number/.test(output));
    assert(/bool:\s+boolean/.test(output));
  });
});
