import {describe, it, expect} from 'bun:test';
import {startTest} from '../../dev/startTest';
import {
  SetVoterWeightRecordTestData,
  RealmTester,
  parseLogsEvent,
  resizeBN,
  setVoterWeightRecordTestData,
} from '../../src';
import {ClanTester, MemberTester, RootTester} from '../../src/VoteAggregator';
import {Keypair} from '@solana/web3.js';
import BN from 'bn.js';

describe('set_voter_weight_record instruction', () => {
  it.each(setVoterWeightRecordTestData.filter(({error}) => !error))(
    'Works',
    async ({
      realm,
      root,
      member,
      memberVoterWeightRecord,
    }: SetVoterWeightRecordTestData) => {
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
        .setVoterWeightRecord()
        .accountsStrict({
          root: rootTester.rootAddress[0],
          member: memberTester.memberAddress[0],
          clan: memberTester.clan ? memberTester.member.clan : null,
          clanVoterWeightRecord:
            clanTester &&
            memberTester.member.clanLeavingTime.eq(
              new BN('9223372036854775807')
            )
              ? clanTester.voterWeightAddress[0]
              : null,
          maxVoterWeightRecord: rootTester.maxVoterWeightAddress[0],
          memberVoterWeightRecord: memberVoterWeightRecord.address,
          memberAuthority: memberTester.ownerAddress,
        })
        .transaction();
      tx.recentBlockhash = testContext.lastBlockhash;
      tx.feePayer = testContext.payer.publicKey;
      tx.sign(testContext.payer, memberTester.owner as Keypair);

      expect(
        testContext.banksClient
          .processTransaction(tx)
          .then(meta => parseLogsEvent(program, meta.logMessages))
      ).resolves.toStrictEqual([
        ...(clanTester &&
        memberTester.member.clanLeavingTime.eq(new BN('9223372036854775807')) // i64::MAX
          ? [
              {
                name: 'ClanVoterWeightChanged',
                data: {
                  clan: clanTester.clanAddress,
                  newVoterWeight: resizeBN(
                    clanTester.voterWeightRecord.voterWeight
                      .sub(memberTester.member.voterWeight)
                      .add(memberVoterWeightRecord.voterWeight)
                  ),
                  oldVoterWeight: resizeBN(
                    clanTester.voterWeightRecord.voterWeight
                  ),
                  root: rootTester.rootAddress[0],
                },
              },
            ]
          : []),
        {
          name: 'MaxVoterWeightChanged',
          data: {
            root: rootTester.rootAddress[0],
            oldMaxVoterWeight: resizeBN(
              rootTester.maxVoterWeight.maxVoterWeight
            ),
            newMaxVoterWeight: resizeBN(
              rootTester.maxVoterWeight.maxVoterWeight
                .sub(memberTester.member.voterWeight)
                .add(memberVoterWeightRecord.voterWeight)
            ),
          },
        },
        {
          name: 'MemberVoterWeightChanged',
          data: {
            member: memberTester.memberAddress[0],
            oldVoterWeight: resizeBN(memberTester.member.voterWeight),
            newVoterWeight: resizeBN(memberVoterWeightRecord.voterWeight),
            root: rootTester.rootAddress[0],
          },
        },
      ]);

      expect(
        program.account.member.fetch(memberTester.memberAddress[0])
      ).resolves.toStrictEqual({
        ...memberTester.member,
        voterWeightRecord: memberVoterWeightRecord.address,
        voterWeight: resizeBN(memberVoterWeightRecord.voterWeight),
        voterWeightExpiry: memberVoterWeightRecord.voterWeightExpiry || null,
      });

      expect(
        program.account.maxVoterWeightRecord.fetch(
          rootTester.maxVoterWeightAddress[0]
        )
      ).resolves.toMatchObject({
        ...rootTester.maxVoterWeight,
        maxVoterWeight: resizeBN(
          rootTester.maxVoterWeight.maxVoterWeight
            .sub(memberTester.member.voterWeight)
            .add(memberVoterWeightRecord.voterWeight)
        ),
      });

      if (clanTester) {
        expect(
          program.account.clan.fetch(clanTester.clanAddress)
        ).resolves.toStrictEqual({
          ...clanTester.clan,
          potentialVoterWeight: resizeBN(
            clanTester.clan.potentialVoterWeight
              .sub(memberTester.member.voterWeight)
              .add(memberVoterWeightRecord.voterWeight)
          ),
        });

        expect(
          program.account.voterWeightRecord.fetch(
            clanTester.voterWeightAddress[0]
          )
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
