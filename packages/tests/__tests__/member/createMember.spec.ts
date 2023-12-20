import {describe, it, expect} from 'bun:test';
import {startTest} from '../../dev/startTest';
import {PublicKey} from '@solana/web3.js';
import {
  CreateMemberTestData,
  RealmTester,
  parseLogsEvent,
  resizeBN,
  createMemberTestData,
} from '../../src';
import {BN} from '@coral-xyz/anchor';
import {SYSTEM_PROGRAM_ID} from '@solana/spl-governance';
import {RootTester} from '../../src/VoteAggregator';

describe('create_member instruction', () => {
  it.each(createMemberTestData.filter(({error}) => !error))(
    'Works',
    async ({realm, root, member}: CreateMemberTestData) => {
      const realmTester = new RealmTester(realm);
      const rootTester = new RootTester({
        ...root,
        realm: realmTester,
      });
      const {testContext, program} = await startTest({
        splGovernanceId: rootTester.splGovernanceId,
        accounts: [
          ...(await realmTester.accounts()),
          ...(await rootTester.accounts()),
          await rootTester.realm.tokenOwnerRecord({
            owner: member.owner.publicKey,
            side: root.side,
          }),
        ],
      });

      const [memberAddress, memberAddressBump] =
        PublicKey.findProgramAddressSync(
          [
            Buffer.from('member', 'utf-8'),
            rootTester.rootAddress[0].toBuffer(),
            member.owner.publicKey.toBuffer(),
          ],
          rootTester.voteAggregatorId
        );

      const [tokenOwnerRecord, tokenOwnerRecordBump] =
        PublicKey.findProgramAddressSync(
          [
            Buffer.from('governance', 'utf-8'),
            rootTester.realm.realmAddress.toBuffer(),
            rootTester.governingTokenMint.toBuffer(),
            member.owner.publicKey.toBuffer(),
          ],
          rootTester.splGovernanceId
        );

      const tx = await program.methods
        .createMember()
        .accountsStrict({
          root: rootTester.rootAddress[0],
          member: memberAddress,
          payer: program.provider.publicKey!,
          systemProgram: SYSTEM_PROGRAM_ID,
          tokenOwnerRecord,
          owner: member.owner.publicKey,
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
          name: 'MemberCreated',
          data: {
            member: memberAddress,
            root: rootTester.rootAddress[0],
            memberIndex: resizeBN(new BN(0)),
            owner: member.owner.publicKey,
          },
        },
      ]);

      expect(
        program.account.member.fetch(memberAddress)
      ).resolves.toStrictEqual({
        root: rootTester.rootAddress[0],
        owner: member.owner.publicKey,
        delegate: PublicKey.default,
        tokenOwnerRecord,
        bumps: {
          address: memberAddressBump,
          tokenOwnerRecord: tokenOwnerRecordBump,
        },
        clan: PublicKey.default,
        clanLeavingTime: new BN('9223372036854775807'), // i64::MAX
        voterWeightRecord: PublicKey.default,
        voterWeight: resizeBN(new BN(0)),
        voterWeightExpiry: null,
      });

      expect(
        program.account.root.fetch(rootTester.rootAddress[0])
      ).resolves.toMatchObject({
        clanCount: resizeBN(new BN(0)),
        memberCount: resizeBN(new BN(1)),
      });
    }
  );
});
