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
  buildSplGovernanceProgram,
} from 'vote-aggregator-tests';
import {context} from '../../src/context';
import {cli} from '../../src/cli';
import {BN} from '@coral-xyz/anchor';
import {Keypair, PublicKey} from '@solana/web3.js';

describe('start-leaving-clan command', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
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
      const tokenConfig =
        (root.side === 'community'
          ? realm.communityTokenConfig
          : realm.councilTokenConfig) || {};
      const voteAggregatorId =
        root.voteAggregatorId ||
        new PublicKey('VoTaGDreyne7jk59uwbgRRbaAzxvNbyNipaJMrRXhjT');
      const [rootAddress] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('root', 'utf-8'),
          realm.realmAddress.toBuffer(),
          root.side === 'community'
            ? realm.communityMint.toBuffer()
            : realm.councilMint!.toBuffer(),
        ],
        voteAggregatorId
      );
      const lockAuthority = PublicKey.findProgramAddressSync(
        [Buffer.from('lock-authority', 'utf8'), rootAddress.toBuffer()],
        voteAggregatorId
      )[0];
      if (tokenConfig.lockAuthorities === undefined) {
        tokenConfig.lockAuthorities = [lockAuthority];
      }
      if (root.side === 'community') {
        realm.communityTokenConfig = tokenConfig;
      } else {
        realm.councilTokenConfig = tokenConfig;
      }

      const realmTester = new RealmTester(realm);
      const rootTester = new RootTester({
        ...root,
        realm: realmTester,
      });
      if (member.locks === undefined) {
        member.locks = [
          {
            lockType: 0,
            authority: rootTester.lockAuthority[0],
            expiry: null,
          },
        ];
      }
      const currentTime = new BN(Math.floor(Date.now() / 1000));
      const memberTester = new MemberTester({
        ...member,
        clanLeavingTime: currentTime.add(member.clanLeavingTimeOffset!),
        root: rootTester,
        clan: member.clan!.address,
      });
      const clanTester = new ClanTester({...member.clan!, root: rootTester});
      const {provider} = await startTest({
        splGovernanceId: rootTester.splGovernanceId,
        accounts: [
          ...(await realmTester.accounts()),
          ...(await rootTester.accounts()),
          ...(await memberTester.accounts()),
          ...(await clanTester.accounts()),
        ],
      });
      const splGovernance = buildSplGovernanceProgram({
        splGovernanceId: realmTester.splGovernanceId,
        connection: provider.connection,
      });
      const {sdk} = context!;

      expect(
        cli()
          .exitOverride((err: Error) => {
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

      expect(
        splGovernance.account.tokenOwnerRecordV2.fetch(
          memberTester.tokenOwnerRecordAddress[0]
        )
      ).resolves.toStrictEqual({
        ...memberTester.tokenOwnerRecord,
        locks: [],
      });
    }
  );
});
