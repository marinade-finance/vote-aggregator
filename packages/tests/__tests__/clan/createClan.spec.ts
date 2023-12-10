import {describe, it, expect} from 'bun:test';
import {startTest} from '../../dev/startTest';
import {PublicKey} from '@solana/web3.js';
import {
  CreateClanTestData,
  buildSplGovernanceProgram,
  parseLogsEvent,
  resizeBN,
  successfulCreateClanTestData,
} from '../../src';
import {BN} from '@coral-xyz/anchor';
import {SYSTEM_PROGRAM_ID} from '@solana/spl-governance';

describe('create_clan instruction', () => {
  it.each(successfulCreateClanTestData)(
    'Works',
    async ({root, clan}: CreateClanTestData) => {
      const {context, program} = await startTest({
        splGovernanceId: root.splGovernanceId,
        accounts: await root.accounts(),
      });
      const splGovernance = buildSplGovernanceProgram({
        splGovernanceId: root.splGovernanceId,
        connection: program.provider.connection,
      });

      const [voterAuthority, voterAuthorityBump] =
        PublicKey.findProgramAddressSync(
          [
            Buffer.from('voter-authority', 'utf-8'),
            clan.address.publicKey.toBuffer(),
          ],
          program.programId
        );
      const [tokenOwnerRecord, tokenOwnerRecordBump] =
        PublicKey.findProgramAddressSync(
          [
            Buffer.from('governance', 'utf-8'),
            root.realm.id.toBuffer(),
            root.governingTokenMint.toBuffer(),
            voterAuthority.toBuffer(),
          ],
          root.splGovernanceId
        );
      const [voterWeightRecord, voterWeightRecordBump] =
        PublicKey.findProgramAddressSync(
          [
            Buffer.from('voter-weight', 'utf-8'),
            clan.address.publicKey.toBuffer(),
          ],
          program.programId
        );

      const tx = await program.methods
        .createClan(clan.owner)
        .accountsStrict({
          root: root.rootAddress()[0],
          clan: clan.address.publicKey,
          realm: root.realm.id,
          governingTokenMint: root.governingTokenMint,
          payer: program.provider.publicKey!,
          governanceProgram: root.splGovernanceId,
          systemProgram: SYSTEM_PROGRAM_ID,
          voterAuthority,
          tokenOwnerRecord,
          voterWeightRecord,
        })
        .transaction();
      tx.recentBlockhash = context.lastBlockhash;
      tx.feePayer = context.payer.publicKey;
      tx.sign(context.payer, clan.address);

      expect(
        context.banksClient
          .processTransaction(tx)
          .then(meta => parseLogsEvent(program, meta.logMessages))
      ).resolves.toStrictEqual({
        clan: clan.address.publicKey,
        root: root.rootAddress()[0],
        clanIndex: resizeBN(new BN(0)),
        owner: clan.owner,
      });

      expect(
        program.account.clan.fetch(clan.address.publicKey)
      ).resolves.toStrictEqual({
        root: root.rootAddress()[0],
        owner: clan.owner,
        delegate: PublicKey.default,
        voterAuthority,
        tokenOwnerRecord,
        voterWeightRecord,
        minVotingWeightToJoin: resizeBN(new BN(0)),
        bumps: {
          voterAuthority: voterAuthorityBump,
          tokenOwnerRecord: tokenOwnerRecordBump,
          voterWeightRecord: voterWeightRecordBump,
        },
        activeMembers: resizeBN(new BN(0)),
        leavingMembers: resizeBN(new BN(0)),
        potentialVotingWeight: resizeBN(new BN(0)),
        name: '',
        description: '',
      });

      expect(
        splGovernance.account.tokenOwnerRecordV2.fetch(tokenOwnerRecord)
      ).resolves.toStrictEqual({
        accountType: {tokenOwnerRecordV2: {}},
        realm: root.realm.id,
        governingTokenMint: root.governingTokenMint,
        governingTokenOwner: voterAuthority,
        governingTokenDepositAmount: resizeBN(new BN(0)),
        unrelinquishedVotesCount: resizeBN(new BN(0)),
        outstandingProposalCount: 0,
        version: 1,
        reserved: [0, 0, 0, 0, 0, 0],
        governanceDelegate: null,
        reservedV2: Array(128).fill(0),
      });

      expect(
        program.account.voterWeightRecord.fetch(voterWeightRecord)
      ).resolves.toStrictEqual({
        realm: root.realm.id,
        governingTokenMint: root.governingTokenMint,
        governingTokenOwner: voterAuthority,
        voterWeight: resizeBN(new BN(0)),
        voterWeightExpiry: null,
        weightAction: null,
        weightActionTarget: null,
        reserved: [0, 0, 0, 0, 0, 0, 0, 0],
      });

      expect(
        program.account.root.fetch(root.rootAddress()[0])
      ).resolves.toMatchObject({
        clanCount: resizeBN(new BN(1)),
        memberCount: resizeBN(new BN(0)),
      });
    }
  );
});
