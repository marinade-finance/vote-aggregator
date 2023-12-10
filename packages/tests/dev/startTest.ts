import {Program} from '@coral-xyz/anchor';
import {BankrunProvider} from 'anchor-bankrun';
import {AddedAccount, startAnchor} from 'solana-bankrun';
import {VoteAggregator, IDL} from '../src/vote_aggregator';
import {PublicKey} from '@solana/web3.js';

export const startTest = async ({
  splGovernanceId,
  accounts = [],
}: {
  splGovernanceId: PublicKey;
  accounts?: AddedAccount[];
}) => {
  const context = await startAnchor(
    '../..',
    [
      {
        name: 'spl_governance',
        programId: splGovernanceId,
      },
    ],
    accounts
  );
  const provider = new BankrunProvider(context);
  const program = new Program<VoteAggregator>(
    IDL,
    new PublicKey('VoTaGDreyne7jk59uwbgRRbaAzxvNbyNipaJMrRXhjT'),
    provider
  );

  return {
    context,
    program,
  };
};
