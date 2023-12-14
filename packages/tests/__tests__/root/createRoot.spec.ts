import {describe, it, expect} from 'bun:test';
import {startTest} from '../../dev/startTest';
import {AccountMeta, Keypair, SystemProgram} from '@solana/web3.js';
import {PublicKey} from '@solana/web3.js';
import {buildSplGovernanceProgram} from '../../src/splGovernance';
import {
  CreateRootTestData,
  RealmTester,
  parseLogsEvent,
  resizeBN,
  createRootTestData,
} from '../../src';
import {BN} from '@coral-xyz/anchor';

describe('create_root instruction', () => {
  it.each(createRootTestData.filter(({error}) => !error))(
    'Works for community side',
    async ({realm}: CreateRootTestData) => {
      const realmTester = new RealmTester(realm);
      const {program, context} = await startTest({
        splGovernanceId: realmTester.splGovernanceId,
        accounts: await realmTester.accounts(),
      });
      const splGovernance = buildSplGovernanceProgram({
        splGovernanceId: realmTester.splGovernanceId,
        connection: program.provider.connection,
      });
      const [rootAddress, rootBump] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('root', 'utf-8'),
          realmTester.realmAddress.toBuffer(),
          realmTester.realm.communityMint.toBuffer(),
        ],
        program.programId
      );
      const [maxVoterWeightAddress, maxVoterWeightBump] =
        PublicKey.findProgramAddressSync(
          [Buffer.from('max-voter-weight', 'utf-8'), rootAddress.toBuffer()],
          program.programId
        );
      const extraAccounts: AccountMeta[] = [
        {
          pubkey: realmTester.realm.communityMint,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: await realmTester.communityTokenHoldings(),
          isWritable: true,
          isSigner: false,
        },
      ];
      if (realmTester.realm.config.councilMint) {
        extraAccounts.push({
          pubkey: realmTester.realm.config.councilMint!,
          isWritable: true,
          isSigner: false,
        });
        extraAccounts.push({
          pubkey: (await realmTester.councilTokenHoldings())!,
          isWritable: true,
          isSigner: false,
        });
      }
      if (realmTester.config.communityTokenConfig.voterWeightAddin) {
        extraAccounts.push({
          pubkey: realmTester.config.communityTokenConfig.voterWeightAddin,
          isWritable: false,
          isSigner: false,
        });
      }
      if (realmTester.config.communityTokenConfig.maxVoterWeightAddin) {
        extraAccounts.push({
          pubkey: realmTester.config.communityTokenConfig.maxVoterWeightAddin,
          isWritable: false,
          isSigner: false,
        });
      }
      if (realmTester.config.councilTokenConfig.voterWeightAddin) {
        extraAccounts.push({
          pubkey: realmTester.config.councilTokenConfig.voterWeightAddin,
          isWritable: false,
          isSigner: false,
        });
      }
      if (realmTester.config.councilTokenConfig.maxVoterWeightAddin) {
        extraAccounts.push({
          pubkey: realmTester.config.councilTokenConfig.maxVoterWeightAddin,
          isWritable: false,
          isSigner: false,
        });
      }

      const tx = await program.methods
        .createRoot()
        .accountsStrict({
          root: rootAddress,
          realm: realmTester.realmAddress,
          realmConfig: await realmTester.realmConfigId(),
          governingTokenMint: realmTester.realm.communityMint,
          realmAuthority: realmTester.realm.authority!,
          maxVoterWeight: maxVoterWeightAddress,
          payer: program.provider.publicKey!,
          governanceProgram: realmTester.splGovernanceId,
          systemProgram: SystemProgram.programId,
          voteAggregatorProgram: program.programId,
        })
        .remainingAccounts(extraAccounts)
        .transaction();
      tx.recentBlockhash = context.lastBlockhash;
      tx.feePayer = context.payer.publicKey;
      tx.sign(context.payer, realmTester.authority as Keypair);

      expect(
        context.banksClient
          .processTransaction(tx)
          .then(meta => parseLogsEvent(program, meta.logMessages))
      ).resolves.toStrictEqual([
        {
          name: 'RootCreated',
          data: {
            root: rootAddress,
            governanceProgram: realmTester.splGovernanceId,
            realm: realmTester.realmAddress,
            governingTokenMint: realmTester.realm.communityMint,
            votingWeightPlugin:
              realmTester.config.communityTokenConfig.voterWeightAddin,
          },
        },
      ]);

      expect(program.account.root.fetch(rootAddress)).resolves.toStrictEqual({
        realm: realmTester.realmAddress,
        governanceProgram: realmTester.splGovernanceId,
        governingTokenMint: realmTester.realm.communityMint,
        votingWeightPlugin:
          realmTester.config.communityTokenConfig.voterWeightAddin ||
          PublicKey.default,
        maxProposalLifetime: resizeBN(new BN(0)),
        bumps: {
          root: rootBump,
          maxVoterWeight: maxVoterWeightBump,
        },
        clanCount: resizeBN(new BN(0)),
        memberCount: resizeBN(new BN(0)),
      });
      expect(
        splGovernance.account.realmV2.fetch(realmTester.realmAddress)
      ).resolves.toStrictEqual(realmTester.realm);
      expect(
        splGovernance.account.realmConfigAccount.fetch(
          await realmTester.realmConfigId()
        )
      ).resolves.toStrictEqual({
        ...realmTester.config,
        communityTokenConfig: {
          ...realmTester.config.communityTokenConfig,
          voterWeightAddin: program.programId,
        },
      });

      expect(
        program.account.maxVoterWeightRecord.fetch(maxVoterWeightAddress)
      ).resolves.toStrictEqual({
        realm: realmTester.realmAddress,
        governingTokenMint: realmTester.realm.communityMint,
        maxVoterWeight: resizeBN(new BN(0)),
        maxVoterWeightExpiry: null,
        reserved: [0, 0, 0, 0, 0, 0, 0, 0],
      });
    }
  );

  it.each(
    createRootTestData.filter(({realm, error}) => !error && realm.councilMint)
  )('Works for council side', async ({realm}: CreateRootTestData) => {
    const realmTester = new RealmTester(realm);
    const {program, context} = await startTest({
      splGovernanceId: realmTester.splGovernanceId,
      accounts: await realmTester.accounts(),
    });
    const splGovernance = buildSplGovernanceProgram({
      splGovernanceId: realmTester.splGovernanceId,
      connection: program.provider.connection,
    });
    const [rootAddress, rootBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('root', 'utf-8'),
        realmTester.realmAddress.toBuffer(),
        realmTester.realm.config.councilMint!.toBuffer(),
      ],
      program.programId
    );
    const [maxVoterWeightAddress, maxVoterWeightBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from('max-voter-weight', 'utf-8'), rootAddress.toBuffer()],
        program.programId
      );

    const extraAccounts: AccountMeta[] = [
      {
        pubkey: realmTester.realm.communityMint,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: await realmTester.communityTokenHoldings(),
        isWritable: true,
        isSigner: false,
      },
    ];
    if (realmTester.realm.config.councilMint) {
      extraAccounts.push({
        pubkey: realmTester.realm.config.councilMint!,
        isWritable: true,
        isSigner: false,
      });
      extraAccounts.push({
        pubkey: (await realmTester.councilTokenHoldings())!,
        isWritable: true,
        isSigner: false,
      });
    }
    if (realmTester.config.communityTokenConfig.voterWeightAddin) {
      extraAccounts.push({
        pubkey: realmTester.config.communityTokenConfig.voterWeightAddin,
        isWritable: false,
        isSigner: false,
      });
    }
    if (realmTester.config.communityTokenConfig.maxVoterWeightAddin) {
      extraAccounts.push({
        pubkey: realmTester.config.communityTokenConfig.maxVoterWeightAddin,
        isWritable: false,
        isSigner: false,
      });
    }
    if (realmTester.config.councilTokenConfig.voterWeightAddin) {
      extraAccounts.push({
        pubkey: realmTester.config.councilTokenConfig.voterWeightAddin,
        isWritable: false,
        isSigner: false,
      });
    }
    if (realmTester.config.councilTokenConfig.maxVoterWeightAddin) {
      extraAccounts.push({
        pubkey: realmTester.config.councilTokenConfig.maxVoterWeightAddin,
        isWritable: false,
        isSigner: false,
      });
    }

    const tx = await program.methods
      .createRoot()
      .accountsStrict({
        root: rootAddress,
        realm: realmTester.realmAddress,
        realmConfig: await realmTester.realmConfigId(),
        governingTokenMint: realmTester.realm.config.councilMint!,
        realmAuthority: realmTester.realm.authority!,
        maxVoterWeight: maxVoterWeightAddress,
        payer: program.provider.publicKey!,
        governanceProgram: realmTester.splGovernanceId,
        systemProgram: SystemProgram.programId,
        voteAggregatorProgram: program.programId,
      })
      .remainingAccounts(extraAccounts)
      .transaction();
    tx.recentBlockhash = context.lastBlockhash;
    tx.feePayer = context.payer.publicKey;
    tx.sign(context.payer, realmTester.authority as Keypair);

    expect(
      context.banksClient
        .processTransaction(tx)
        .then(meta => parseLogsEvent(program, meta.logMessages))
    ).resolves.toStrictEqual([
      {
        name: 'RootCreated',
        data: {
          root: rootAddress,
          governanceProgram: realmTester.splGovernanceId,
          realm: realmTester.realmAddress,
          governingTokenMint: realmTester.realm.config.councilMint!,
          votingWeightPlugin:
            realmTester.config.councilTokenConfig.voterWeightAddin,
        },
      },
    ]);

    expect(program.account.root.fetch(rootAddress)).resolves.toStrictEqual({
      realm: realmTester.realmAddress,
      governanceProgram: realmTester.splGovernanceId,
      governingTokenMint: realmTester.realm.config.councilMint!,
      votingWeightPlugin:
        realmTester.config.councilTokenConfig.voterWeightAddin ||
        PublicKey.default,
      maxProposalLifetime: resizeBN(new BN(0)),
      bumps: {
        root: rootBump,
        maxVoterWeight: maxVoterWeightBump,
      },
      clanCount: resizeBN(new BN(0)),
      memberCount: resizeBN(new BN(0)),
    });
    expect(
      splGovernance.account.realmV2.fetch(realmTester.realmAddress)
    ).resolves.toStrictEqual(realmTester.realm);
    expect(
      splGovernance.account.realmConfigAccount.fetch(
        await realmTester.realmConfigId()
      )
    ).resolves.toStrictEqual({
      ...realmTester.config,
      councilTokenConfig: {
        ...realmTester.config.councilTokenConfig,
        voterWeightAddin: program.programId,
      },
    });

    expect(
      program.account.maxVoterWeightRecord.fetch(maxVoterWeightAddress)
    ).resolves.toStrictEqual({
      realm: realmTester.realmAddress,
      governingTokenMint: realmTester.realm.config.councilMint!,
      maxVoterWeight: resizeBN(new BN(0)),
      maxVoterWeightExpiry: null,
      reserved: [0, 0, 0, 0, 0, 0, 0, 0],
    });
  });
});
