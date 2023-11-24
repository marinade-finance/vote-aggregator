import {Connection} from '@solana/web3.js';
import {VoteAggregatorSdk} from '../src';
import {describe, it, expect} from 'bun:test';

describe('dummy', () => {
  const sdk = new VoteAggregatorSdk(new Connection('http://localhost:8899'));
  it('creates instruction', async () => {
    await expect(sdk.dummyInstruction()).resolves.toMatchSnapshot('dummy');
  });
});
