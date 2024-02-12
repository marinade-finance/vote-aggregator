import {startTest} from '../../dev/startTest';
import {
  UpdateVoterWeightTestData,
  RealmTester,
  RootTester,
  resizeBN,
  updateVoterWeightTestData,
  MemberTester,
  ClanTester,
} from 'vote-aggregator-tests';
import {context} from '../../src/context';
import {cli} from '../../src/cli';
import {BN} from '@coral-xyz/anchor';
import {Keypair} from '@solana/web3.js';

describe('update-voter-weight command', () => {
  let stdout: jest.SpyInstance;

  beforeEach(() => {
    stdout = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    stdout.mockRestore();
  });

  it.each(updateVoterWeightTestData.filter(({error}) => !error))(
    'Works',
    async ({
      realm,
      root,
      member,
      memberVoterWeightRecord,
    }: UpdateVoterWeightTestData) => {
      const realmTester = new RealmTester(realm);
      const rootTester = new RootTester({
        ...root,
        realm: realmTester,
      });
      const memberTester = new MemberTester({
        ...member,
        root: rootTester,
        clan: member.clan?.address,
      });
      const clanTester =
        member.clan && new ClanTester({...member.clan!, root: rootTester});
      await startTest({
        splGovernanceId: rootTester.splGovernanceId,
        accounts: [
          ...(await realmTester.accounts()),
          ...(await rootTester.accounts()),
          ...(await memberTester.accounts()),
          ...(clanTester ? await clanTester.accounts() : []),
          await realmTester.voterWeightRecord({
            ...memberVoterWeightRecord,
            side: root.side,
            owner:
              member.owner instanceof Keypair
                ? member.owner.publicKey
                : member.owner,
          }),
        ],
      });
      const {sdk} = context!;

      await expect(
        cli()
          .exitOverride((err: Error) => {
            throw err;
          })
          .parseAsync(
            [
              'update-voter-weight',
              '--realm',
              rootTester.realm.realmAddress.toString(),
              '--side',
              rootTester.side,
              '--owner',
              memberTester.ownerAddress.toBase58(),
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
        voterWeight: resizeBN(memberVoterWeightRecord.voterWeight),
        voterWeightExpiry: memberVoterWeightRecord.voterWeightExpiry || null,
      });

      await expect(
        sdk.root.fetchMaxVoterWeight({rootAddress: rootTester.rootAddress[0]})
      ).resolves.toMatchObject({
        ...rootTester.maxVoterWeight,
        maxVoterWeight: resizeBN(
          rootTester.maxVoterWeight.maxVoterWeight
            .sub(memberTester.member.voterWeight)
            .add(memberVoterWeightRecord.voterWeight)
        ),
      });

      if (clanTester) {
        await expect(
          sdk.clan.fetchClan(clanTester.clanAddress)
        ).resolves.toStrictEqual({
          ...clanTester.clan,
          potentialVoterWeight: resizeBN(
            clanTester.clan.potentialVoterWeight
              .sub(memberTester.member.voterWeight)
              .add(memberVoterWeightRecord.voterWeight)
          ),
        });

        await expect(
          sdk.clan.fetchVoterWeight({
            clanAddress: clanTester.clanAddress,
          })
        ).resolves.toStrictEqual({
          ...clanTester.voterWeightRecord,
          voterWeight: resizeBN(
            memberTester.member.clanLeavingTime.eq(
              new BN('9223372036854775807')
            ) // i64::MAX
              ? clanTester.voterWeightRecord.voterWeight
                  .sub(memberTester.member.voterWeight)
                  .add(memberVoterWeightRecord.voterWeight)
              : clanTester.voterWeightRecord.voterWeight
          ),
        });
      }
    }
  );
});
