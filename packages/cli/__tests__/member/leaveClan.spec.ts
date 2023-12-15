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
  LeaveClanTestData,
  RealmTester,
  RootTester,
  resizeBN,
  leaveClanTestData,
  MemberTester,
  ClanTester,
} from 'vote-aggregator-tests';
import {context} from '../../src/context';
import {cli} from '../../src/cli';
import {BN} from '@coral-xyz/anchor';
import {PublicKey} from '@solana/web3.js';

describe('start-leaving-clan command', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stdout: Mock<(message?: any, ...optionalParams: any[]) => void>;

  beforeEach(() => {
    stdout = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    stdout.mockRestore();
  });

  it.each(leaveClanTestData.filter(({error}) => !error))(
    'Works',
    async ({realm, root, member}: LeaveClanTestData) => {
      const realmTester = new RealmTester(realm);
      const rootTester = new RootTester({
        ...root,
        realm: realmTester,
      });
      const currentTime = new BN(Math.floor(Date.now() / 1000));
      const memberTester = new MemberTester({
        ...member,
        clanLeavingTime: currentTime.add(member.clanLeavingTimeOffset!),
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

      expect(
        cli()
          .exitOverride(err => {
            throw err;
          })
          .parseAsync(
            [
              'leave-clan',
              '--realm',
              rootTester.realm.realmAddress.toString(),
              '--side',
              rootTester.side,
              '--owner',
              '[' + member.owner.secretKey.toString() + ']',
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
        sdk.member.fetchMember({memberAddress: memberTester.memberAddress[0]})
      ).resolves.toStrictEqual({
        ...memberTester.member,
        clan: PublicKey.default,
        clanLeavingTime: new BN('9223372036854775807'), // i64::MAX
      });

      expect(sdk.clan.fetchClan(clanTester.clanAddress)).resolves.toStrictEqual(
        {
          ...clanTester.clan,
          potentialVoterWeight: resizeBN(
            clanTester.clan.potentialVoterWeight.sub(
              memberTester.member.voterWeight
            )
          ),
          leavingMembers: resizeBN(clanTester.clan.leavingMembers.subn(1)),
        }
      );
    }
  );
});
