import {startTest} from '../../dev/startTest';
import {
  UpdateVoterWeightTestData,
  RealmTester,
  parseLogsEvent,
  updateVoterWeightTestData,
} from '../../src';
import {ClanTester, MemberTester, RootTester} from '../../src/VoteAggregator';
import {Keypair} from '@solana/web3.js';
import BN from 'bn.js';

describe('update_voter_weight instruction', () => {
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
        member.clan && new ClanTester({...member.clan, root: rootTester});
      const {testContext, program} = await startTest({
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

      const tx = await program.methods
        .updateVoterWeight()
        .accountsStrict({
          root: rootTester.rootAddress[0],
          member: memberTester.memberAddress[0],
          clan: memberTester.clan ? memberTester.member.clan : null,
          clanVwr:
            clanTester &&
            memberTester.member.clanLeavingTime.eq(
              new BN('9223372036854775807')
            )
              ? clanTester.voterWeightAddress[0]
              : null,
          maxVwr: rootTester.maxVoterWeightAddress[0],
          memberVwr: memberVoterWeightRecord.address,
        })
        .transaction();
      tx.recentBlockhash = testContext.lastBlockhash;
      tx.feePayer = testContext.payer.publicKey;
      tx.sign(testContext.payer);

      await expect(
        testContext.banksClient
          .processTransaction(tx)
          .then(meta => parseLogsEvent(program, meta.logMessages))
      ).resolves.toStrictEqual([
        {
          name: 'MemberVoterWeightChanged',
          data: {
            member: memberTester.memberAddress[0],
            oldVoterWeight: memberTester.member.voterWeight,
            newVoterWeight: memberVoterWeightRecord.voterWeight,
            oldVoterWeightRecord: memberTester.member.voterWeightRecord,
            newVoterWeightRecord: memberTester.member.voterWeightRecord,
            root: rootTester.rootAddress[0],
          },
        },
        {
          name: 'MaxVoterWeightChanged',
          data: {
            root: rootTester.rootAddress[0],
            oldMaxVoterWeight: rootTester.maxVoterWeight.maxVoterWeight,
            newMaxVoterWeight: rootTester.maxVoterWeight.maxVoterWeight
              .sub(memberTester.member.voterWeight)
              .add(memberVoterWeightRecord.voterWeight),
          },
        },
        ...(clanTester &&
        memberTester.member.clanLeavingTime.eq(new BN('9223372036854775807')) // i64::MAX
          ? [
              {
                name: 'ClanVoterWeightChanged',
                data: {
                  clan: clanTester.clanAddress,
                  newVoterWeight: clanTester.voterWeightRecord.voterWeight
                    .sub(memberTester.member.voterWeight)
                    .add(memberVoterWeightRecord.voterWeight),
                  oldVoterWeight: clanTester.voterWeightRecord.voterWeight,
                  oldPermamentVoterWeight: clanTester.clan.permanentVoterWeight,
                  newPermamentVoterWeight: clanTester.clan.permanentVoterWeight
                    .sub(memberTester.member.voterWeight)
                    .add(memberVoterWeightRecord.voterWeight),
                  oldIsPermanent: true,
                  newIsPermanent: true,
                  root: rootTester.rootAddress[0],
                },
              },
            ]
          : []),
      ]);

      await expect(
        program.account.member.fetch(memberTester.memberAddress[0])
      ).resolves.toStrictEqual({
        ...memberTester.member,
        voterWeight: memberVoterWeightRecord.voterWeight,
        voterWeightExpiry: memberVoterWeightRecord.voterWeightExpiry || null,
      });

      await expect(
        program.account.maxVoterWeightRecord.fetch(
          rootTester.maxVoterWeightAddress[0]
        )
      ).resolves.toMatchObject({
        ...rootTester.maxVoterWeight,
        maxVoterWeight: rootTester.maxVoterWeight.maxVoterWeight
          .sub(memberTester.member.voterWeight)
          .add(memberVoterWeightRecord.voterWeight),
      });

      if (clanTester) {
        await expect(
          program.account.clan.fetch(clanTester.clanAddress)
        ).resolves.toStrictEqual({
          ...clanTester.clan,
          permanentVoterWeight: memberTester.member.clanLeavingTime.eq(
            new BN('9223372036854775807')
          ) // i64::MAX
            ? clanTester.clan.permanentVoterWeight
                .sub(memberTester.member.voterWeight)
                .add(memberVoterWeightRecord.voterWeight)
            : clanTester.clan.permanentVoterWeight,
        });

        await expect(
          program.account.voterWeightRecord.fetch(
            clanTester.voterWeightAddress[0]
          )
        ).resolves.toStrictEqual({
          ...clanTester.voterWeightRecord,
          voterWeight: memberTester.member.clanLeavingTime.eq(
            new BN('9223372036854775807')
          ) // i64::MAX
            ? clanTester.voterWeightRecord.voterWeight
                .sub(memberTester.member.voterWeight)
                .add(memberVoterWeightRecord.voterWeight)
            : clanTester.voterWeightRecord.voterWeight,
        });
      }
    }
  );
});
