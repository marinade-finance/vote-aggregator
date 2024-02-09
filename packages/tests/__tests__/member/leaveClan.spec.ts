import {describe, it, expect} from 'bun:test';
import {startTest} from '../../dev/startTest';
import {
  leaveClanTestData,
  RealmTester,
  parseLogsEvent,
  resizeBN,
  LeaveClanTestData,
  buildSplGovernanceProgram,
} from '../../src';
import {ClanTester, MemberTester, RootTester} from '../../src/VoteAggregator';
import {BN} from '@coral-xyz/anchor';
import {Keypair, PublicKey} from '@solana/web3.js';

describe('start_leaving_clan instruction', () => {
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
      if (tokenConfig.lockAuthorities === undefined) {
        tokenConfig.lockAuthorities = [
          PublicKey.findProgramAddressSync(
            [Buffer.from('lock-authority', 'utf8'), rootAddress.toBuffer()],
            voteAggregatorId
          )[0],
        ];
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
      const {testContext, program} = await startTest({
        splGovernanceId: rootTester.splGovernanceId,
        accounts: [
          ...(await realmTester.accounts()),
          ...(await rootTester.accounts()),
          ...(await memberTester.accounts()),
          ...(await clanTester.accounts()),
        ],
      });
      const splGovernance = buildSplGovernanceProgram({
        splGovernanceId: rootTester.splGovernanceId,
        connection: program.provider.connection,
      });

      const tx = await program.methods
        .leaveClan()
        .accountsStrict({
          root: rootTester.rootAddress[0],
          member: memberTester.memberAddress[0],
          clan: memberTester.member.clan,
          memberAuthority: memberTester.ownerAddress,
          governanceProgram: rootTester.splGovernanceId,
          lockAuthority: rootTester.lockAuthority[0],
          memberTokenOwnerRecord: memberTester.tokenOwnerRecordAddress[0],
        })
        .transaction();
      tx.recentBlockhash = testContext.lastBlockhash;
      tx.feePayer = testContext.payer.publicKey;
      tx.sign(testContext.payer, member.owner as Keypair);

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
            owner: memberTester.ownerAddress,
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
