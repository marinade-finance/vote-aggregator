import {describe, it, expect} from 'bun:test';
import {startTest} from '../../dev/startTest';
import {
  StartLeavingClanTestData,
  RealmTester,
  parseLogsEvent,
  resizeBN,
  startLeavingClanTestData,
} from '../../src';
import {ClanTester, MemberTester, RootTester} from '../../src/VoteAggregator';
import {BN} from '@coral-xyz/anchor';
import {Keypair} from '@solana/web3.js';

describe('start_leaving_clan instruction', () => {
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
      const {testContext, program} = await startTest({
        splGovernanceId: rootTester.splGovernanceId,
        accounts: [
          ...(await realmTester.accounts()),
          ...(await rootTester.accounts()),
          ...(await memberTester.accounts()),
          ...(await clanTester.accounts()),
        ],
      });

      const tx = await program.methods
        .startLeavingClan()
        .accountsStrict({
          root: rootTester.rootAddress[0],
          member: memberTester.memberAddress[0],
          clan: memberTester.member.clan,
          memberAuthority: memberTester.ownerAddress,
          clanVoterWeightRecord: clanTester.voterWeightAddress[0],
        })
        .transaction();
      tx.recentBlockhash = testContext.lastBlockhash;
      tx.feePayer = testContext.payer.publicKey;
      tx.sign(testContext.payer, member.owner as Keypair);

      const time = (await testContext.banksClient.getClock()).unixTimestamp;
      expect(
        testContext.banksClient
          .processTransaction(tx)
          .then(meta => parseLogsEvent(program, meta.logMessages))
      ).resolves.toStrictEqual([
        {
          name: 'StartingLeavingClan',
          data: {
            clan: clanTester.clanAddress,
            member: memberTester.memberAddress[0],
            owner: memberTester.ownerAddress,
            root: rootTester.rootAddress[0],
          },
        },
        {
          name: 'ClanVoterWeightChanged',
          data: {
            clan: clanTester.clanAddress,
            newVoterWeight: resizeBN(
              clanTester.voterWeightRecord.voterWeight.sub(
                memberTester.member.voterWeight
              )
            ),
            oldVoterWeight: resizeBN(clanTester.voterWeightRecord.voterWeight),
            root: rootTester.rootAddress[0],
          },
        },
      ]);

      expect(
        program.account.member.fetch(memberTester.memberAddress[0])
      ).resolves.toStrictEqual({
        ...memberTester.member,
        clanLeavingTime: new BN(time.toString()).add(
          rootTester.root.maxProposalLifetime
        ),
      });

      expect(
        program.account.clan.fetch(clanTester.clanAddress)
      ).resolves.toStrictEqual({
        ...clanTester.clan,
        activeMembers: resizeBN(clanTester.clan.activeMembers.subn(1)),
        leavingMembers: resizeBN(clanTester.clan.leavingMembers.addn(1)),
      });

      expect(
        program.account.voterWeightRecord.fetch(
          clanTester.voterWeightAddress[0]
        )
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
