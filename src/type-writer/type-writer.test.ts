import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TypeWriter } from './type-writer.ts';

describe('TypeWriter', () => {
  const test = new TypeWriter('Test');

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
