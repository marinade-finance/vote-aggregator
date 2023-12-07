import {Program} from '@coral-xyz/anchor';
import {BankrunProvider} from 'anchor-bankrun';
import {AddedAccount, startAnchor} from 'solana-bankrun';
import {VoteAggregator, IDL} from './vote_aggregator';
import {PublicKey} from '@solana/web3.js';

export const startTest = async ({
  splGovernanceId,
  accounts = [],
}: {
  splGovernanceId: PublicKey;
  accounts?: AddedAccount[];
}) => {
  const testContext = await startAnchor(
    '../..',
    [
      {
        name: 'spl_governance',
        programId: splGovernanceId,
      },
    ],
    accounts
  );
  const provider = new BankrunProvider(testContext);
  const program = new Program<VoteAggregator>(
    IDL,
    new PublicKey('DDN7fpM4tY3ZHdgSuf8B4UBMakh4kqPzuDZHxgVyyNg'),
    provider
  );

  return {
    program,
  };
};
