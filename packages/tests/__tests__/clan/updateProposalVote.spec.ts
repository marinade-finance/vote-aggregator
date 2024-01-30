import {describe, it, expect} from 'bun:test';
import {startTest} from '../../dev/startTest';
import {
  UpdateProposalVoteTestData,
  RealmTester,
  parseLogsEvent,
  updateProposalVoteTestData,
  buildSplGovernanceProgram,
  resizeBN,
} from '../../src';
import {ClanTester, RootTester} from '../../src/VoteAggregator';
import {PublicKey} from '@solana/web3.js';
import {GovernanceTester} from '../../src/SplGovernance/governance';
import {ProposalTester} from '../../src/SplGovernance';
import {SYSTEM_PROGRAM_ID} from '@solana/spl-governance';
import {VoteTester} from '../../src/SplGovernance/vote';

describe('forced_cancel_proposal instruction', () => {
  it.each(updateProposalVoteTestData.filter(({error}) => !error))(
    'Works',
    async ({
      realm,
      root,
      clan,
      governance,
      proposal,
      vote,
    }: UpdateProposalVoteTestData) => {
      const realmTester = new RealmTester(realm);
      const rootTester = new RootTester({
        ...root,
        realm: realmTester,
      });
      const clanTester = new ClanTester({...clan, root: rootTester});
      const governanceTester = new GovernanceTester({
        ...governance,
        realm: realmTester,
      });
      const proposalTester = new ProposalTester({
        ...proposal,
        governance: governanceTester,
        clan: proposal.owner ? undefined : clanTester,
      });
      const voteTester = new VoteTester({
        ...vote,
        proposal: proposalTester,
        clan: vote.owner ? undefined : clanTester,
      });
      const {testContext, program} = await startTest({
        splGovernanceId: rootTester.splGovernanceId,
        accounts: [
          ...(await realmTester.accounts()),
          ...(await rootTester.accounts()),
          ...(await clanTester.accounts()),
          await governanceTester.account(),
          await proposalTester.account(),
          await voteTester.account(),
          await realmTester.tokenOwnerRecord({
            owner: proposalTester.owner,
            governingTokenMint: proposalTester.proposal.governingTokenMint,
          }),
        ],
      });
      const splGovernance = buildSplGovernanceProgram({
        splGovernanceId: rootTester.splGovernanceId,
        connection: program.provider.connection,
      });

      const [voterAuthority] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('voter-authority', 'utf-8'),
          clanTester.clanAddress.toBuffer(),
        ],
        program.programId
      );
      const [tokenOwnerRecord] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('governance', 'utf-8'),
          rootTester.realm.realmAddress.toBuffer(),
          rootTester.governingTokenMint.toBuffer(),
          voterAuthority.toBuffer(),
        ],
        rootTester.splGovernanceId
      );

      const tx = await program.methods
        .updateProposalVote()
        .accountsStrict({
          root: rootTester.rootAddress[0],
          clan: clanTester.clanAddress,
          governanceProgram: rootTester.splGovernanceId,
          voterAuthority,
          tokenOwnerRecord,
          realm: realmTester.realmAddress,
          realmConfig: await realmTester.realmConfigId(),
          governingTokenMint: proposalTester.proposal.governingTokenMint,
          systemProgram: SYSTEM_PROGRAM_ID,
          governance: governanceTester.governanceAddress,
          proposal: proposalTester.proposalAddress,
          clanVoterWeightRecord: clanTester.voterWeightAddress[0],
          payer: program.provider.publicKey!,
          proposalOwnerRecord: proposalTester.proposal.tokenOwnerRecord,
          maxVoterWeight: null, // TODO
          voteRecord: await voteTester.voteAddress(),
        })
        .transaction();
      tx.recentBlockhash = testContext.lastBlockhash;
      tx.feePayer = testContext.payer.publicKey;
      tx.sign(testContext.payer);

      expect(
        testContext.banksClient
          .processTransaction(tx)
          .then(meta => parseLogsEvent(program, meta.logMessages))
      ).resolves.toStrictEqual([
        {
          name: 'ProposalVoteUpdated',
          data: {
            clan: clanTester.clanAddress,
            proposal: proposalTester.proposalAddress,
            oldVotingWeight: resizeBN(voteTester.vote.voterWeight),
            newVotingWeight: resizeBN(clanTester.voterWeightRecord.voterWeight),
          },
        },
      ]);

      expect(
        splGovernance.account.voteRecordV2.fetch(await voteTester.voteAddress())
      ).resolves.toMatchObject({
        voterWeight: resizeBN(clanTester.voterWeightRecord.voterWeight),
      });

      expect(
        splGovernance.account.proposalV2.fetch(proposalTester.proposalAddress)
      ).resolves.toMatchObject({
        options: [
          {
            ...proposalTester.proposal.options[0],
            voteWeight: resizeBN(
              proposalTester.proposal.options[0].voteWeight
                .sub(voteTester.vote.voterWeight)
                .add(clanTester.voterWeightRecord.voterWeight)
            ),
          },
        ],
      });
    }
  );
});
