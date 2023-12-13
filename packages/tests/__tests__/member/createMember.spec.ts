import {describe, it, expect} from 'bun:test';
import {startTest} from '../../dev/startTest';
import {PublicKey} from '@solana/web3.js';
import {
  CreateMemberTestData,
  parseLogsEvent,
  resizeBN,
  successfulCreateMemberTestData,
} from '../../src';
import {BN} from '@coral-xyz/anchor';
import {SYSTEM_PROGRAM_ID} from '@solana/spl-governance';

describe('create_member instruction', () => {
  it.each(successfulCreateMemberTestData)(
    'Works',
    async ({root, member}: CreateMemberTestData) => {
      const {context, program} = await startTest({
        splGovernanceId: root.splGovernanceId,
        accounts: [
          await root.realm.tokenOwnerRecord({
            owner: member.owner.publicKey,
            side: root.side,
          }),
          ...(await root.accounts()),
        ],
      });

      const [memberAddress, memberAddressBump] =
        PublicKey.findProgramAddressSync(
          [
            Buffer.from('member', 'utf-8'),
            root.rootAddress()[0].toBuffer(),
            member.owner.publicKey.toBuffer(),
          ],
          root.voteAggregatorId
        );

      const [tokenOwnerRecord, tokenOwnerRecordBump] =
        PublicKey.findProgramAddressSync(
          [
            Buffer.from('governance', 'utf-8'),
            root.realm.id.toBuffer(),
            root.governingTokenMint.toBuffer(),
            member.owner.publicKey.toBuffer(),
          ],
          root.splGovernanceId
        );

      const tx = await program.methods
        .createMember()
        .accountsStrict({
          root: root.rootAddress()[0],
          member: memberAddress,
          payer: program.provider.publicKey!,
          systemProgram: SYSTEM_PROGRAM_ID,
          tokenOwnerRecord,
          owner: member.owner.publicKey,
        })
        .transaction();
      tx.recentBlockhash = context.lastBlockhash;
      tx.feePayer = context.payer.publicKey;
      tx.sign(context.payer, member.owner);

      expect(
        context.banksClient
          .processTransaction(tx)
          .then(meta => parseLogsEvent(program, meta.logMessages))
      ).resolves.toStrictEqual({
        member: memberAddress,
        root: root.rootAddress()[0],
        memberIndex: resizeBN(new BN(0)),
        owner: member.owner.publicKey,
      });

      expect(
        program.account.member.fetch(memberAddress)
      ).resolves.toStrictEqual({
        root: root.rootAddress()[0],
        owner: member.owner.publicKey,
        delegate: PublicKey.default,
        tokenOwnerRecord,
        bumps: {
          address: memberAddressBump,
          tokenOwnerRecord: tokenOwnerRecordBump,
        },
        clan: PublicKey.default,
        clanLeavingTime: new BN(0), // resize is not needed for signed integers
      });

      expect(
        program.account.root.fetch(root.rootAddress()[0])
      ).resolves.toMatchObject({
        clanCount: resizeBN(new BN(0)),
        memberCount: resizeBN(new BN(1)),
      });
    }
  );
});
