import {describe, it, expect} from 'bun:test';
import {startTest} from '../../dev/startTest';
import {AccountMeta, Keypair, SystemProgram} from '@solana/web3.js';
import {PublicKey} from '@solana/web3.js';
import {buildSplGovernanceProgram} from '../../src/splGovernance';
import {
  CreateRootTestData,
  parseLogsEvent,
  resizeBN,
  successfulCreateRootTestData,
} from '../../src';
import {BN} from '@coral-xyz/anchor';

describe('create_root instruction', () => {
  it.each(successfulCreateRootTestData)(
    'Works for community side',
    async (realmData: CreateRootTestData) => {
      const {program, context} = await startTest({
        splGovernanceId: realmData.splGovernanceId,
        accounts: await realmData.accounts(),
      });
      const splGovernance = buildSplGovernanceProgram({
        splGovernanceId: realmData.splGovernanceId,
        connection: program.provider.connection,
      });
      const [rootAddress, rootBump] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('root', 'utf-8'),
          realmData.id.toBuffer(),
          realmData.realm.communityMint.toBuffer(),
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
          pubkey: realmData.realm.communityMint,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: await realmData.communityTokenHoldings(),
          isWritable: true,
          isSigner: false,
        },
      ];
      if (realmData.realm.config.councilMint) {
        extraAccounts.push({
          pubkey: realmData.realm.config.councilMint!,
          isWritable: true,
          isSigner: false,
        });
        extraAccounts.push({
          pubkey: (await realmData.councilTokenHoldings())!,
          isWritable: true,
          isSigner: false,
        });
      }
      if (realmData.config.communityTokenConfig.voterWeightAddin) {
        extraAccounts.push({
          pubkey: realmData.config.communityTokenConfig.voterWeightAddin,
          isWritable: false,
          isSigner: false,
        });
      }
      if (realmData.config.communityTokenConfig.maxVoterWeightAddin) {
        extraAccounts.push({
          pubkey: realmData.config.communityTokenConfig.maxVoterWeightAddin,
          isWritable: false,
          isSigner: false,
        });
      }
      if (realmData.config.councilTokenConfig.voterWeightAddin) {
        extraAccounts.push({
          pubkey: realmData.config.councilTokenConfig.voterWeightAddin,
          isWritable: false,
          isSigner: false,
        });
      }
      if (realmData.config.councilTokenConfig.maxVoterWeightAddin) {
        extraAccounts.push({
          pubkey: realmData.config.councilTokenConfig.maxVoterWeightAddin,
          isWritable: false,
          isSigner: false,
        });
      }

      const tx = await program.methods
        .createRoot()
        .accountsStrict({
          root: rootAddress,
          realm: realmData.id,
          realmConfig: await realmData.realmConfigId(),
          governingTokenMint: realmData.realm.communityMint,
          realmAuthority: realmData.realm.authority!,
          maxVoterWeight: maxVoterWeightAddress,
          payer: program.provider.publicKey!,
          governanceProgram: realmData.splGovernanceId,
          systemProgram: SystemProgram.programId,
          voteAggregatorProgram: program.programId,
        })
        .remainingAccounts(extraAccounts)
        .transaction();
      tx.recentBlockhash = context.lastBlockhash;
      tx.feePayer = context.payer.publicKey;
      tx.sign(context.payer, realmData.authority as Keypair);

      expect(
        context.banksClient
          .processTransaction(tx)
          .then(meta => parseLogsEvent(program, meta.logMessages))
      ).resolves.toStrictEqual({
        root: rootAddress,
        governanceProgram: realmData.splGovernanceId,
        realm: realmData.id,
        governingTokenMint: realmData.realm.communityMint,
        votingWeightPlugin:
          realmData.config.communityTokenConfig.voterWeightAddin,
      });

      expect(program.account.root.fetch(rootAddress)).resolves.toStrictEqual({
        realm: realmData.id,
        governanceProgram: realmData.splGovernanceId,
        governingTokenMint: realmData.realm.communityMint,
        votingWeightPlugin:
          realmData.config.communityTokenConfig.voterWeightAddin ||
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
        splGovernance.account.realmV2.fetch(realmData.id)
      ).resolves.toStrictEqual(realmData.realm);
      expect(
        splGovernance.account.realmConfigAccount.fetch(
          await realmData.realmConfigId()
        )
      ).resolves.toStrictEqual({
        ...realmData.config,
        communityTokenConfig: {
          ...realmData.config.communityTokenConfig,
          voterWeightAddin: program.programId,
        },
      });

      expect(
        program.account.maxVoterWeightRecord.fetch(maxVoterWeightAddress)
      ).resolves.toStrictEqual({
        realm: realmData.id,
        governingTokenMint: realmData.realm.communityMint,
        maxVoterWeight: resizeBN(new BN(0)),
        maxVoterWeightExpiry: null,
        reserved: [0, 0, 0, 0, 0, 0, 0, 0],
      });
    }
  );

  it.each(
    successfulCreateRootTestData.filter(({realm}) => realm.config.councilMint)
  )('Works for council side', async (realmData: CreateRootTestData) => {
    const {program, context} = await startTest({
      splGovernanceId: realmData.splGovernanceId,
      accounts: await realmData.accounts(),
    });
    const splGovernance = buildSplGovernanceProgram({
      splGovernanceId: realmData.splGovernanceId,
      connection: program.provider.connection,
    });
    const [rootAddress, rootBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('root', 'utf-8'),
        realmData.id.toBuffer(),
        realmData.realm.config.councilMint!.toBuffer(),
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
        pubkey: realmData.realm.communityMint,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: await realmData.communityTokenHoldings(),
        isWritable: true,
        isSigner: false,
      },
    ];
    if (realmData.realm.config.councilMint) {
      extraAccounts.push({
        pubkey: realmData.realm.config.councilMint!,
        isWritable: true,
        isSigner: false,
      });
      extraAccounts.push({
        pubkey: (await realmData.councilTokenHoldings())!,
        isWritable: true,
        isSigner: false,
      });
    }
    if (realmData.config.communityTokenConfig.voterWeightAddin) {
      extraAccounts.push({
        pubkey: realmData.config.communityTokenConfig.voterWeightAddin,
        isWritable: false,
        isSigner: false,
      });
    }
    if (realmData.config.communityTokenConfig.maxVoterWeightAddin) {
      extraAccounts.push({
        pubkey: realmData.config.communityTokenConfig.maxVoterWeightAddin,
        isWritable: false,
        isSigner: false,
      });
    }
    if (realmData.config.councilTokenConfig.voterWeightAddin) {
      extraAccounts.push({
        pubkey: realmData.config.councilTokenConfig.voterWeightAddin,
        isWritable: false,
        isSigner: false,
      });
    }
    if (realmData.config.councilTokenConfig.maxVoterWeightAddin) {
      extraAccounts.push({
        pubkey: realmData.config.councilTokenConfig.maxVoterWeightAddin,
        isWritable: false,
        isSigner: false,
      });
    }

    const tx = await program.methods
      .createRoot()
      .accountsStrict({
        root: rootAddress,
        realm: realmData.id,
        realmConfig: await realmData.realmConfigId(),
        governingTokenMint: realmData.realm.config.councilMint!,
        realmAuthority: realmData.realm.authority!,
        maxVoterWeight: maxVoterWeightAddress,
        payer: program.provider.publicKey!,
        governanceProgram: realmData.splGovernanceId,
        systemProgram: SystemProgram.programId,
        voteAggregatorProgram: program.programId,
      })
      .remainingAccounts(extraAccounts)
      .transaction();
    tx.recentBlockhash = context.lastBlockhash;
    tx.feePayer = context.payer.publicKey;
    tx.sign(context.payer, realmData.authority as Keypair);

    expect(
      context.banksClient
        .processTransaction(tx)
        .then(meta => parseLogsEvent(program, meta.logMessages))
    ).resolves.toStrictEqual({
      root: rootAddress,
      governanceProgram: realmData.splGovernanceId,
      realm: realmData.id,
      governingTokenMint: realmData.realm.config.councilMint!,
      votingWeightPlugin: realmData.config.councilTokenConfig.voterWeightAddin,
    });

    expect(program.account.root.fetch(rootAddress)).resolves.toStrictEqual({
      realm: realmData.id,
      governanceProgram: realmData.splGovernanceId,
      governingTokenMint: realmData.realm.config.councilMint!,
      votingWeightPlugin:
        realmData.config.councilTokenConfig.voterWeightAddin ||
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
      splGovernance.account.realmV2.fetch(realmData.id)
    ).resolves.toStrictEqual(realmData.realm);
    expect(
      splGovernance.account.realmConfigAccount.fetch(
        await realmData.realmConfigId()
      )
    ).resolves.toStrictEqual({
      ...realmData.config,
      councilTokenConfig: {
        ...realmData.config.councilTokenConfig,
        voterWeightAddin: program.programId,
      },
    });

    expect(
      program.account.maxVoterWeightRecord.fetch(maxVoterWeightAddress)
    ).resolves.toStrictEqual({
      realm: realmData.id,
      governingTokenMint: realmData.realm.config.councilMint!,
      maxVoterWeight: resizeBN(new BN(0)),
      maxVoterWeightExpiry: null,
      reserved: [0, 0, 0, 0, 0, 0, 0, 0],
    });
  });
});
