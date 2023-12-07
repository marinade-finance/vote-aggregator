import {describe, it, expect} from 'bun:test';
import {startTest} from '../dev/startTest';
import {AccountMeta, SystemProgram} from '@solana/web3.js';
import {PublicKey} from '@solana/web3.js';
import {buildSplGovernanceProgram} from '../src/splGovernance';
import {
  CreateRootTestData,
  resizeBN,
  successfulCreateRootTestData,
} from '../src';
import {BN} from '@coral-xyz/anchor';

describe('create_root instruction', () => {
  it.each(successfulCreateRootTestData)(
    'Works for community side',
    async ({realm, splGovernanceId}: CreateRootTestData) => {
      let splGovernance = buildSplGovernanceProgram({splGovernanceId});
      const {program} = await startTest({
        splGovernanceId,
        accounts: await realm.accounts(splGovernance),
      });
      // Recreate the program handle with the correct connection
      splGovernance = buildSplGovernanceProgram({
        splGovernanceId,
        connection: program.provider.connection,
      });
      const [rootAddress, rootBump] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('root', 'utf-8'),
          realm.id.toBuffer(),
          realm.realm.communityMint.toBuffer(),
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
          pubkey: realm.realm.communityMint,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: await realm.communityTokenHoldings(splGovernanceId),
          isWritable: true,
          isSigner: false,
        },
      ];
      if (realm.realm.config.councilMint) {
        extraAccounts.push({
          pubkey: realm.realm.config.councilMint!,
          isWritable: true,
          isSigner: false,
        });
        extraAccounts.push({
          pubkey: (await realm.councilTokenHoldings(splGovernanceId))!,
          isWritable: true,
          isSigner: false,
        });
      }
      if (realm.config.communityTokenConfig.voterWeightAddin) {
        extraAccounts.push({
          pubkey: realm.config.communityTokenConfig.voterWeightAddin,
          isWritable: false,
          isSigner: false,
        });
      }
      if (realm.config.communityTokenConfig.maxVoterWeightAddin) {
        extraAccounts.push({
          pubkey: realm.config.communityTokenConfig.maxVoterWeightAddin,
          isWritable: false,
          isSigner: false,
        });
      }
      if (realm.config.councilTokenConfig.voterWeightAddin) {
        extraAccounts.push({
          pubkey: realm.config.councilTokenConfig.voterWeightAddin,
          isWritable: false,
          isSigner: false,
        });
      }
      if (realm.config.councilTokenConfig.maxVoterWeightAddin) {
        extraAccounts.push({
          pubkey: realm.config.councilTokenConfig.maxVoterWeightAddin,
          isWritable: false,
          isSigner: false,
        });
      }

      expect(
        program.methods
          .createRoot()
          .accountsStrict({
            root: rootAddress,
            realm: realm.id,
            realmConfig: await realm.realmConfigId(splGovernanceId),
            governingTokenMint: realm.realm.communityMint,
            realmAuthority: realm.realm.authority!,
            maxVoterWeight: maxVoterWeightAddress,
            payer: program.provider.publicKey!,
            governanceProgram: splGovernanceId,
            systemProgram: SystemProgram.programId,
            voteAggregatorProgram: program.programId,
          })
          .remainingAccounts(extraAccounts)
          .signers([realm.authority!])
          .rpc()
      ).resolves.toBeTruthy();

      expect(program.account.root.fetch(rootAddress)).resolves.toStrictEqual({
        realm: realm.id,
        governanceProgram: splGovernanceId,
        governingTokenMint: realm.realm.communityMint,
        votingWeightPlugin:
          realm.config.communityTokenConfig.voterWeightAddin ||
          PublicKey.default,
        maxProposalLifetime: resizeBN(new BN(0)),
        bumps: {
          root: rootBump,
          maxVoterWeight: maxVoterWeightBump,
        },
        clanCount: resizeBN(new BN(0)),
        memeberCount: resizeBN(new BN(0)),
      });
      expect(
        splGovernance.account.realmV2.fetch(realm.id)
      ).resolves.toStrictEqual(realm.realm);
      expect(
        splGovernance.account.realmConfigAccount.fetch(
          await realm.realmConfigId(splGovernanceId)
        )
      ).resolves.toStrictEqual({
        ...realm.config,
        communityTokenConfig: {
          ...realm.config.communityTokenConfig,
          voterWeightAddin: program.programId,
        },
      });

      expect(
        program.account.maxVoterWeightRecord.fetch(maxVoterWeightAddress)
      ).resolves.toStrictEqual({
        realm: realm.id,
        governingTokenMint: realm.realm.communityMint,
        maxVoterWeight: resizeBN(new BN(0)),
        maxVoterWeightExpiry: null,
        reserved: [0, 0, 0, 0, 0, 0, 0, 0],
      });
    }
  );

  it.each(
    successfulCreateRootTestData.filter(
      ({realm}) => realm.realm.config.councilMint
    )
  )(
    'Works for council side',
    async ({realm, splGovernanceId}: CreateRootTestData) => {
      let splGovernance = buildSplGovernanceProgram({splGovernanceId});
      const {program} = await startTest({
        splGovernanceId,
        accounts: await realm.accounts(splGovernance),
      });
      // Recreate the program handle with the correct connection
      splGovernance = buildSplGovernanceProgram({
        splGovernanceId,
        connection: program.provider.connection,
      });
      const [rootAddress, rootBump] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('root', 'utf-8'),
          realm.id.toBuffer(),
          realm.realm.config.councilMint!.toBuffer(),
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
          pubkey: realm.realm.communityMint,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: await realm.communityTokenHoldings(splGovernanceId),
          isWritable: true,
          isSigner: false,
        },
      ];
      if (realm.realm.config.councilMint) {
        extraAccounts.push({
          pubkey: realm.realm.config.councilMint!,
          isWritable: true,
          isSigner: false,
        });
        extraAccounts.push({
          pubkey: (await realm.councilTokenHoldings(splGovernanceId))!,
          isWritable: true,
          isSigner: false,
        });
      }
      if (realm.config.communityTokenConfig.voterWeightAddin) {
        extraAccounts.push({
          pubkey: realm.config.communityTokenConfig.voterWeightAddin,
          isWritable: false,
          isSigner: false,
        });
      }
      if (realm.config.communityTokenConfig.maxVoterWeightAddin) {
        extraAccounts.push({
          pubkey: realm.config.communityTokenConfig.maxVoterWeightAddin,
          isWritable: false,
          isSigner: false,
        });
      }
      if (realm.config.councilTokenConfig.voterWeightAddin) {
        extraAccounts.push({
          pubkey: realm.config.councilTokenConfig.voterWeightAddin,
          isWritable: false,
          isSigner: false,
        });
      }
      if (realm.config.councilTokenConfig.maxVoterWeightAddin) {
        extraAccounts.push({
          pubkey: realm.config.councilTokenConfig.maxVoterWeightAddin,
          isWritable: false,
          isSigner: false,
        });
      }
      expect(
        program.methods
          .createRoot()
          .accountsStrict({
            root: rootAddress,
            realm: realm.id,
            realmConfig: await realm.realmConfigId(splGovernanceId),
            governingTokenMint: realm.realm.config.councilMint!,
            realmAuthority: realm.realm.authority!,
            maxVoterWeight: maxVoterWeightAddress,
            payer: program.provider.publicKey!,
            governanceProgram: splGovernanceId,
            systemProgram: SystemProgram.programId,
            voteAggregatorProgram: program.programId,
          })
          .remainingAccounts(extraAccounts)
          .signers([realm.authority!])
          .rpc()
      ).resolves.toBeTruthy();

      expect(program.account.root.fetch(rootAddress)).resolves.toStrictEqual({
        realm: realm.id,
        governanceProgram: splGovernanceId,
        governingTokenMint: realm.realm.config.councilMint!,
        votingWeightPlugin:
          realm.config.councilTokenConfig.voterWeightAddin || PublicKey.default,
        maxProposalLifetime: resizeBN(new BN(0)),
        bumps: {
          root: rootBump,
          maxVoterWeight: maxVoterWeightBump,
        },
        clanCount: resizeBN(new BN(0)),
        memeberCount: resizeBN(new BN(0)),
      });
      expect(
        splGovernance.account.realmV2.fetch(realm.id)
      ).resolves.toStrictEqual(realm.realm);
      expect(
        splGovernance.account.realmConfigAccount.fetch(
          await realm.realmConfigId(splGovernanceId)
        )
      ).resolves.toStrictEqual({
        ...realm.config,
        councilTokenConfig: {
          ...realm.config.councilTokenConfig,
          voterWeightAddin: program.programId,
        },
      });

      expect(
        program.account.maxVoterWeightRecord.fetch(maxVoterWeightAddress)
      ).resolves.toStrictEqual({
        realm: realm.id,
        governingTokenMint: realm.realm.config.councilMint!,
        maxVoterWeight: resizeBN(new BN(0)),
        maxVoterWeightExpiry: null,
        reserved: [0, 0, 0, 0, 0, 0, 0, 0],
      });
    }
  );
});
