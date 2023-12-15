import {describe, it, expect} from 'bun:test';
import {startTest} from '../../dev/startTest';
import {
  leaveClanTestData,
  RealmTester,
  parseLogsEvent,
  resizeBN,
  LeaveClanTestData,
} from '../../src';
import {ClanTester, MemberTester, RootTester} from '../../src/VoteAggregator';
import {BN} from '@coral-xyz/anchor';
import {PublicKey} from '@solana/web3.js';

describe('start_leaving_clan instruction', () => {
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
        .leaveClan()
        .accountsStrict({
          root: rootTester.rootAddress[0],
          member: memberTester.memberAddress[0],
          clan: memberTester.member.clan,
          memberAuthority: memberTester.owner.publicKey,
        })
        .transaction();
      tx.recentBlockhash = testContext.lastBlockhash;
      tx.feePayer = testContext.payer.publicKey;
      tx.sign(testContext.payer, member.owner);

      expect(
        testContext.banksClient
          .processTransaction(tx)
          .then(meta => parseLogsEvent(program, meta.logMessages))
      ).resolves.toStrictEqual([
        {
          name: 'ClanMemberLeft',
          data: {
            clan: clanTester.clanAddress,
            member: memberTester.memberAddress[0],
            owner: memberTester.owner.publicKey,
            root: rootTester.rootAddress[0],
          },
        },
      ]);

      expect(
        program.account.member.fetch(memberTester.memberAddress[0])
      ).resolves.toStrictEqual({
        ...memberTester.member,
        clan: PublicKey.default,
        clanLeavingTime: new BN('9223372036854775807'), // i64::MAX
      });

      expect(
        program.account.clan.fetch(clanTester.clanAddress)
      ).resolves.toStrictEqual({
        ...clanTester.clan,
        potentialVoterWeight: resizeBN(
          clanTester.clan.potentialVoterWeight.sub(
            memberTester.member.voterWeight
          )
        ),
        leavingMembers: resizeBN(clanTester.clan.leavingMembers.subn(1)),
      });
    }
  );
});
