import {startAnchor} from 'solana-bankrun';
import {BankrunProvider} from 'anchor-bankrun';
import {Program} from '@coral-xyz/anchor';
// eslint-disable-next-line node/no-unpublished-import
import {VoteAggregator, IDL} from '../../../target/types/vote_aggregator';
import {PublicKey} from '@solana/web3.js';
import {describe, it, expect} from 'bun:test';

describe('dummy', () => {
  it('runs', async () => {
    const context = await startAnchor('../..', [], []);
    const provider = new BankrunProvider(context);

    const program = new Program<VoteAggregator>(
      IDL,
      new PublicKey('DDN7fpM4tY3ZHdgSuf8B4UBMakh4kqPzuDZHxgVyyNg'),
      provider
    );

    await expect(program.methods.initialize().rpc()).resolves.toBeTruthy();
  });
});
