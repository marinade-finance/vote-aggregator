import {cli} from '../src/cli';
import {startTest} from '../dev/startTest';
import {describe, beforeEach, afterEach, it, spyOn, expect} from 'bun:test';

describe('dummy', () => {
  let stdout;

  beforeEach(() => {
    stdout = spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    stdout.mockRestore();
  });

  it('runs', async () => {
    await startTest([]);
    await expect(
      cli().exitOverride().parseAsync(['dummy'], {from: 'user'})
    ).resolves.toBeTruthy();
    expect(stdout.mock.calls).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([expect.stringMatching(/^Success/)]),
      ])
    );
    stdout.mockRestore();
  });
});
