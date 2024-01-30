import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  spyOn,
  Mock,
} from 'bun:test';
import {startTest} from '../../dev/startTest';
import {
  UpdateProposalVoteTestData,
  RealmTester,
  RootTester,
  updateProposalVoteTestData,
  ClanTester,
  resizeBN,
} from 'vote-aggregator-tests';
import {cli} from '../../src/cli';
import {getProposal, getVoteRecord} from '@solana/spl-governance';
import {GovernanceTester} from 'vote-aggregator-tests/src/SplGovernance/governance';
import {ProposalTester} from 'vote-aggregator-tests/src/SplGovernance';
import {VoteTester} from 'vote-aggregator-tests/src/SplGovernance/vote';

describe('update-proposal-vote command', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  let stdout: Mock<(message?: any, ...optionalParams: any[]) => void>;

  beforeEach(() => {
    stdout = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    stdout.mockRestore();
  });

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
      const {provider} = await startTest({
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

      expect(
        cli()
          .exitOverride((err: Error) => {
            throw err;
          })
          .parseAsync(
            [
              'update-proposal-vote',
              '--clan',
              clanTester.clanAddress.toBase58(),
              '--proposal',
              proposalTester.proposalAddress.toBase58(),
            ],
            {from: 'user'}
          )
      ).resolves.toBeTruthy();
      expect(stdout.mock.calls).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([expect.stringMatching(/^Success/)]),
        ])
      );

      expect(
        getVoteRecord(provider.connection, await voteTester.voteAddress()).then(
          ({account}) => account
        )
      ).resolves.toMatchObject({
        voterWeight: resizeBN(clanTester.voterWeightRecord.voterWeight),
      });
      expect(
        getProposal(provider.connection, proposalTester.proposalAddress).then(
          ({account}) => account.options[0].voteWeight
        )
      ).resolves.toStrictEqual(
        resizeBN(
          proposalTester.proposal.options[0].voteWeight
            .sub(voteTester.vote.voterWeight)
            .add(clanTester.voterWeightRecord.voterWeight)
        )
      );
    }
  );
});
