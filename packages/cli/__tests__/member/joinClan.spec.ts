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
import {PublicKey} from '@solana/web3.js';
import {
  JoinClanTestData,
  RealmTester,
  RootTester,
  resizeBN,
  joinClanTestData,
  MemberTester,
  ClanTester,
} from 'vote-aggregator-tests';
import {BN} from '@coral-xyz/anchor';
import {context} from '../../src/context';
import {cli} from '../../src/cli';

describe('join-clan command', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stdout: Mock<(message?: any, ...optionalParams: any[]) => void>;

  beforeEach(() => {
    stdout = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    stdout.mockRestore();
  });

  it.each(joinClanTestData.filter(({error}) => !error))(
    'Works',
    async ({
      realm,
      root,
      member,
      memberVoterWeight,
      clan,
    }: JoinClanTestData) => {
      const realmTester = new RealmTester(realm);
      const rootTester = new RootTester({
        ...root,
        realm: realmTester,
      });
      const memberTester = new MemberTester({...member, root: rootTester});
      const clanTester = new ClanTester({...clan, root: rootTester});
      await startTest({
        splGovernanceId: rootTester.splGovernanceId,
        accounts: [
          ...(await realmTester.accounts()),
          ...(await rootTester.accounts()),
          ...(await memberTester.accounts()),
          ...(await clanTester.accounts()),
          await realmTester.voterWeightRecord({
            ...memberVoterWeight,
            side: root.side,
            owner: member.owner.publicKey,
          }),
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
              'join-clan',
              '--owner',
              '[' + member.owner.secretKey.toString() + ']',
              '--member-voter-weight',
              memberVoterWeight.address.toBase58(),
              '--clan',
              clanTester.clanAddress.toBase58(),
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
        clan: clanTester.clanAddress,
        voterWeight: resizeBN(memberVoterWeight.voterWeight),
        voterWeightExpiry:
          (memberVoterWeight.voterWeightExpiry &&
            resizeBN(memberVoterWeight.voterWeightExpiry)) ||
          null,
      });

      expect(sdk.clan.fetchClan(clanTester.clanAddress)).resolves.toStrictEqual(
        {
          ...clanTester.clan,
          activeMembers: resizeBN(clanTester.clan.activeMembers.addn(1)),
        }
      );

      expect(
        sdk.clan.fetchVoterWeight({
          clanAddress: clanTester.clanAddress,
        })
      ).resolves.toStrictEqual({
        ...clanTester.voterWeightRecord,
        voterWeight: resizeBN(
          clanTester.voterWeightRecord.voterWeight.add(
            memberVoterWeight.voterWeight
          )
        ),
      });

      expect(
        sdk.root.fetchMaxVoterWeight({rootAddress: rootTester.rootAddress[0]})
      ).resolves.toMatchObject({
        ...rootTester.maxVoterWeight,
        maxVoterWeight: resizeBN(
          rootTester.maxVoterWeight.maxVoterWeight.add(
            memberVoterWeight.voterWeight
          )
        ),
      });
    }
  );
});
