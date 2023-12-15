import {describe, it, expect} from 'bun:test';
import {startTest} from '../../dev/startTest';
import {PublicKey} from '@solana/web3.js';
import {
  CreateClanTestData,
  RealmTester,
  buildSplGovernanceProgram,
  parseLogsEvent,
  resizeBN,
  createClanTestData,
} from '../../src';
import {BN} from '@coral-xyz/anchor';
import {SYSTEM_PROGRAM_ID} from '@solana/spl-governance';
import {RootTester} from '../../src/VoteAggregator';

describe('create_clan instruction', () => {
  it.each(createClanTestData.filter(({error}) => !error))(
    'Works',
    async ({realm, root, clan}: CreateClanTestData) => {
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
        ],
      });
      const splGovernance = buildSplGovernanceProgram({
        splGovernanceId: rootTester.splGovernanceId,
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
            rootTester.realm.realmAddress.toBuffer(),
            rootTester.governingTokenMint.toBuffer(),
            voterAuthority.toBuffer(),
          ],
          rootTester.splGovernanceId
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
          root: rootTester.rootAddress[0],
          clan: clan.address.publicKey,
          realm: rootTester.realm.realmAddress,
          governingTokenMint: rootTester.governingTokenMint,
          payer: program.provider.publicKey!,
          governanceProgram: rootTester.splGovernanceId,
          systemProgram: SYSTEM_PROGRAM_ID,
          voterAuthority,
          tokenOwnerRecord,
          voterWeightRecord,
        })
        .transaction();
      tx.recentBlockhash = testContext.lastBlockhash;
      tx.feePayer = testContext.payer.publicKey;
      tx.sign(testContext.payer, clan.address);

      expect(
        testContext.banksClient
          .processTransaction(tx)
          .then(meta => parseLogsEvent(program, meta.logMessages))
      ).resolves.toStrictEqual([
        {
          name: 'ClanCreated',
          data: {
            clan: clan.address.publicKey,
            root: rootTester.rootAddress[0],
            clanIndex: resizeBN(new BN(0)),
            owner: clan.owner,
          },
        },
      ]);

      expect(
        program.account.clan.fetch(clan.address.publicKey)
      ).resolves.toStrictEqual({
        root: rootTester.rootAddress[0],
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
        potentialVoterWeight: resizeBN(new BN(0)),
        name: '',
        description: '',
      });

      expect(
        splGovernance.account.tokenOwnerRecordV2.fetch(tokenOwnerRecord)
      ).resolves.toStrictEqual({
        accountType: {tokenOwnerRecordV2: {}},
        realm: rootTester.realm.realmAddress,
        governingTokenMint: rootTester.governingTokenMint,
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
        realm: rootTester.realm.realmAddress,
        governingTokenMint: rootTester.governingTokenMint,
        governingTokenOwner: voterAuthority,
        voterWeight: resizeBN(new BN(0)),
        voterWeightExpiry: null,
        weightAction: null,
        weightActionTarget: null,
        reserved: [0, 0, 0, 0, 0, 0, 0, 0],
      });

      expect(
        program.account.root.fetch(rootTester.rootAddress[0])
      ).resolves.toMatchObject({
        clanCount: resizeBN(new BN(1)),
        memberCount: resizeBN(new BN(0)),
      });
    }
  );
});
