import {startTest} from '../../dev/startTest';
import {
  StartLeavingClanTestData,
  RealmTester,
  RootTester,
  resizeBN,
  startLeavingClanTestData,
  MemberTester,
  ClanTester,
} from 'vote-aggregator-tests';
import {context} from '../../src/context';
import {cli} from '../../src/cli';
import {BN} from '@coral-xyz/anchor';
import {Keypair} from '@solana/web3.js';

describe('start-leaving-clan command', () => {
  let stdout: jest.SpyInstance;

  beforeEach(() => {
    stdout = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    stdout.mockRestore();
  });

  it.each(startLeavingClanTestData.filter(({error}) => !error))(
    'Works',
    async ({realm, root, member}: StartLeavingClanTestData) => {
      const realmTester = new RealmTester(realm);
      const rootTester = new RootTester({
        ...root,
        realm: realmTester,
      });
      const memberTester = new MemberTester({
        ...member,
        root: rootTester,
        clan: member.clan!.address,
      });
      const clanTester = new ClanTester({...member.clan!, root: rootTester});
      const {testContext} = await startTest({
        splGovernanceId: rootTester.splGovernanceId,
        accounts: [
          ...(await realmTester.accounts()),
          ...(await rootTester.accounts()),
          ...(await memberTester.accounts()),
          ...(await clanTester.accounts()),
        ],
      });
      const {sdk} = context!;

      const time = (await testContext.banksClient.getClock()).unixTimestamp;
      await expect(
        cli()
          .exitOverride((err: Error) => {
            throw err;
          })
          .parseAsync(
            [
              'start-leaving-clan',
              '--realm',
              rootTester.realm.realmAddress.toString(),
              '--side',
              rootTester.side,
              '--owner',
              '[' + (memberTester.owner as Keypair).secretKey.toString() + ']',
            ],
            {from: 'user'}
          )
      ).resolves.toBeTruthy();
      expect(stdout.mock.calls).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([expect.stringMatching(/^Success/)]),
        ])
      );

      await expect(
        sdk.member.fetchMember({memberAddress: memberTester.memberAddress[0]})
      ).resolves.toStrictEqual({
        ...memberTester.member,
        clanLeavingTime: new BN(time.toString()).add(
          rootTester.root.maxProposalLifetime
        ),
      });

      await expect(
        sdk.clan.fetchClan(clanTester.clanAddress)
      ).resolves.toStrictEqual({
        ...clanTester.clan,
        activeMembers: resizeBN(clanTester.clan.activeMembers.subn(1)),
        leavingMembers: resizeBN(clanTester.clan.leavingMembers.addn(1)),
      });

      await expect(
        sdk.clan.fetchVoterWeight({
          clanAddress: clanTester.clanAddress,
        })
      ).resolves.toStrictEqual({
        ...clanTester.voterWeightRecord,
        voterWeight: resizeBN(
          clanTester.voterWeightRecord.voterWeight.sub(
            memberTester.member.voterWeight
          )
        ),
      });
    }
  );
});
