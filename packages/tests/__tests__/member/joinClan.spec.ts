import {describe, it, expect} from 'bun:test';
import {startTest} from '../../dev/startTest';
import {
  JoinClanTestData,
  RealmTester,
  parseLogsEvent,
  resizeBN,
  joinClanTestData,
} from '../../src';
import {ClanTester, MemberTester, RootTester} from '../../src/VoteAggregator';

describe('join_clan instruction', () => {
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
      const {context, program} = await startTest({
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

      const tx = await program.methods
        .joinClan()
        .accountsStrict({
          root: rootTester.rootAddress[0],
          member: memberTester.memberAddress[0],
          clan: clan.address,
          memberAuthority: memberTester.owner.publicKey,
          clanVoterWeightRecord: clanTester.voterWeightAddress[0],
          memberTokenOwnerRecord: memberTester.tokenOwnerRecordAddress[0],
          memberVoterWeightRecord: memberVoterWeight.address,
          maxVoterWeightRecord: rootTester.maxVoterWeightAddress[0],
        })
        .transaction();
      tx.recentBlockhash = context.lastBlockhash;
      tx.feePayer = context.payer.publicKey;
      tx.sign(context.payer, member.owner);

      expect(
        context.banksClient
          .processTransaction(tx)
          .then(meta => parseLogsEvent(program, meta.logMessages))
      ).resolves.toStrictEqual([
        {
          name: 'ClanMemberAdded',
          data: {
            clan: clanTester.clanAddress,
            member: memberTester.memberAddress[0],
            owner: memberTester.owner.publicKey,
            root: rootTester.rootAddress[0],
          },
        },
        {
          name: 'MemberVoterWeightChanged',
          data: {
            member: memberTester.memberAddress[0],
            newVoterWeight: resizeBN(memberVoterWeight.voterWeight),
            oldVoterWeight: resizeBN(memberTester.member.voterWeight),
            root: rootTester.rootAddress[0],
          },
        },
        {
          name: 'ClanVoterWeightChanged',
          data: {
            clan: clanTester.clanAddress,
            newVoterWeight: resizeBN(
              clanTester.voterWeightRecord.voterWeight.add(
                memberVoterWeight.voterWeight
              )
            ),
            oldVoterWeight: resizeBN(clanTester.voterWeightRecord.voterWeight),
            root: rootTester.rootAddress[0],
          },
        },
        {
          name: 'MaxVoterWeightChanged',
          data: {
            newMaxVoterWeight: resizeBN(
              rootTester.maxVoterWeight.maxVoterWeight.add(
                memberVoterWeight.voterWeight
              )
            ),
            oldMaxVoterWeight: resizeBN(
              rootTester.maxVoterWeight.maxVoterWeight
            ),
            root: rootTester.rootAddress[0],
          },
        },
      ]);

      expect(
        program.account.member.fetch(memberTester.memberAddress[0])
      ).resolves.toStrictEqual({
        ...memberTester.member,
        clan: clanTester.clanAddress,
        voterWeight: resizeBN(memberVoterWeight.voterWeight),
        voterWeightExpiry:
          (memberVoterWeight.voterWeightExpiry &&
            resizeBN(memberVoterWeight.voterWeightExpiry)) ||
          null,
      });

      expect(
        program.account.clan.fetch(clanTester.clanAddress)
      ).resolves.toStrictEqual({
        ...clanTester.clan,
        activeMembers: resizeBN(clanTester.clan.activeMembers.addn(1)),
      });

      expect(
        program.account.voterWeightRecord.fetch(
          clanTester.voterWeightAddress[0]
        )
      ).resolves.toStrictEqual({
        ...clanTester.voterWeightRecord,
        voterWeight: resizeBN(
          clanTester.voterWeightRecord.voterWeight.add(
            memberVoterWeight.voterWeight
          )
        ),
      });

      expect(
        program.account.maxVoterWeightRecord.fetch(
          rootTester.maxVoterWeightAddress[0]
        )
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
