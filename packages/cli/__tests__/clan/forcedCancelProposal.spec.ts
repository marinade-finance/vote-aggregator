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
  ForcedCancelProposalTestData,
  RealmTester,
  RootTester,
  forcedCancelProposalTestData,
  ClanTester,
} from 'vote-aggregator-tests';
import {cli} from '../../src/cli';
import {ProposalState, getProposal} from '@solana/spl-governance';
import {GovernanceTester} from 'vote-aggregator-tests/src/SplGovernance/governance';
import {ProposalTester} from 'vote-aggregator-tests/src/SplGovernance';

describe('cancel-proposal command', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  let stdout: Mock<(message?: any, ...optionalParams: any[]) => void>;

  beforeEach(() => {
    stdout = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    stdout.mockRestore();
  });

  it.each(forcedCancelProposalTestData.filter(({error}) => !error))(
    'Works',
    async ({
      realm,
      root,
      clan,
      governance,
      proposal,
    }: ForcedCancelProposalTestData) => {
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
      const {provider} = await startTest({
        splGovernanceId: rootTester.splGovernanceId,
        accounts: [
          ...(await realmTester.accounts()),
          ...(await rootTester.accounts()),
          ...(await clanTester.accounts()),
          await governanceTester.account(),
          await proposalTester.account(),
        ],
      });

      expect(
        cli()
          .exitOverride((err: Error) => {
            throw err;
          })
          .parseAsync(
            [
              'cancel-proposal',
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
        getProposal(provider.connection, proposalTester.proposalAddress).then(
          ({account}) => account
        )
      ).resolves.toMatchObject({
        state: ProposalState.Cancelled,
      });
    }
  );
});
