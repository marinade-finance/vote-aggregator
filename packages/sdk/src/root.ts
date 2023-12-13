import {
  AccountMeta,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import {RealmSide, VoteAggregatorSdk} from './sdk';
import {
  Realm,
  RealmConfigAccount,
  getRealm,
  getRealmConfig,
  getRealmConfigAddress,
  getTokenHoldingAddress,
} from '@solana/spl-governance';
import {IdlAccounts} from '@coral-xyz/anchor';
import {VoteAggregator} from './vote_aggregator';

export type RootAccount = IdlAccounts<VoteAggregator>['root'];
export type MaxVoterWeightAccount =
  IdlAccounts<VoteAggregator>['maxVoterWeightRecord'];

export class RootSdk {
  constructor(public readonly sdk: VoteAggregatorSdk) {}

  rootAddress({
    realmAddress,
    governingTokenMint,
  }: {
    realmAddress: PublicKey;
    governingTokenMint: PublicKey;
  }): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('root', 'utf-8'),
        realmAddress.toBuffer(),
        governingTokenMint.toBuffer(),
      ],
      this.sdk.programId
    );
  }

  maxVoterWieghtAddress({
    rootAddress,
  }: {
    rootAddress: PublicKey;
  }): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('max-voter-weight', 'utf-8'), rootAddress.toBuffer()],
      this.sdk.programId
    );
  }

  fetchRoot(rootAddress: PublicKey): Promise<RootAccount> {
    return this.sdk.program.account.root.fetch(rootAddress);
  }

  fetchMaxVoterWeight({
    rootAddress,
    maxVoterWeightAddress,
  }: {
    rootAddress?: PublicKey;
    maxVoterWeightAddress?: PublicKey;
  }): Promise<MaxVoterWeightAccount> {
    if (!maxVoterWeightAddress) {
      if (!rootAddress) {
        throw new Error('rootAddress is required');
      }
      maxVoterWeightAddress = this.maxVoterWieghtAddress({rootAddress})[0];
    }
    return this.sdk.program.account.maxVoterWeightRecord.fetch(
      maxVoterWeightAddress
    );
  }

  async createRootInstruction({
    splGovernanceId,
    realmAddress,
    realmData,
    realmConfigData,
    side,
    payer,
  }: {
    splGovernanceId?: PublicKey;
    realmAddress: PublicKey;
    realmData?: Realm;
    realmConfigData?: RealmConfigAccount;
    side: RealmSide;
    payer: PublicKey;
  }): Promise<TransactionInstruction> {
    if (!realmData) {
      const {account, owner} = await getRealm(
        this.sdk.connection,
        realmAddress
      );
      if (splGovernanceId && !owner.equals(splGovernanceId)) {
        throw new Error(
          `Realm ${realmAddress} is not owned by ${splGovernanceId}`
        );
      }
      realmData = account;
      splGovernanceId = owner;
    }
    if (!splGovernanceId) {
      throw new Error('splGovernanceId is required');
    }
    if (!realmConfigData) {
      const {account} = await getRealmConfig(
        this.sdk.connection,
        await getRealmConfigAddress(splGovernanceId, realmAddress)
      );
      realmConfigData = account;
    }

    const governingTokenMint =
      side === 'community'
        ? realmData.communityMint
        : realmData.config.councilMint!;
    if (!governingTokenMint) {
      throw new Error(`Realm ${realmAddress} does not have a ${side} mint`);
    }

    const [rootAddress] = this.rootAddress({realmAddress, governingTokenMint});
    const [maxVoterWeightAddress] = this.maxVoterWieghtAddress({rootAddress});

    const extraAccounts: AccountMeta[] = [
      {
        pubkey: realmData.communityMint,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: await getTokenHoldingAddress(
          splGovernanceId,
          realmAddress,
          realmData.communityMint
        ),
        isWritable: true,
        isSigner: false,
      },
    ];
    if (realmData.config.councilMint) {
      extraAccounts.push({
        pubkey: realmData.config.councilMint!,
        isWritable: true,
        isSigner: false,
      });
      extraAccounts.push({
        pubkey: await getTokenHoldingAddress(
          splGovernanceId,
          realmAddress,
          realmData.config.councilMint
        ),
        isWritable: true,
        isSigner: false,
      });
    }
    if (realmConfigData.communityTokenConfig.voterWeightAddin) {
      extraAccounts.push({
        pubkey: realmConfigData.communityTokenConfig.voterWeightAddin,
        isWritable: false,
        isSigner: false,
      });
    }
    if (realmConfigData.communityTokenConfig.maxVoterWeightAddin) {
      extraAccounts.push({
        pubkey: realmConfigData.communityTokenConfig.maxVoterWeightAddin,
        isWritable: false,
        isSigner: false,
      });
    }
    if (realmConfigData.councilTokenConfig.voterWeightAddin) {
      extraAccounts.push({
        pubkey: realmConfigData.councilTokenConfig.voterWeightAddin,
        isWritable: false,
        isSigner: false,
      });
    }
    if (realmConfigData.councilTokenConfig.maxVoterWeightAddin) {
      extraAccounts.push({
        pubkey: realmConfigData.councilTokenConfig.maxVoterWeightAddin,
        isWritable: false,
        isSigner: false,
      });
    }

    return await this.sdk.program.methods
      .createRoot()
      .accountsStrict({
        root: rootAddress,
        realm: realmAddress,
        realmConfig: await getRealmConfigAddress(splGovernanceId, realmAddress),
        governingTokenMint,
        realmAuthority: realmData.authority!,
        maxVoterWeight: maxVoterWeightAddress,
        payer,
        governanceProgram: splGovernanceId,
        systemProgram: SystemProgram.programId,
        voteAggregatorProgram: this.sdk.program.programId,
      })
      .remainingAccounts(extraAccounts)
      .instruction();
  }
}
