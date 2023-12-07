import {Program, Provider} from '@coral-xyz/anchor';
import {VoteAggregator, IDL} from './vote_aggregator';
import {
  AccountMeta,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  Realm,
  RealmConfigAccount,
  getRealm,
  getRealmConfig,
  getRealmConfigAddress,
  getTokenHoldingAddress,
} from '@solana/spl-governance';

class ReadonlyProvider implements Provider {
  constructor(public connection: Connection) {}
}

export class VoteAggregatorSdk {
  program: Program<VoteAggregator>;

  constructor(
    connection: Connection = new Connection('http://localhost:8899'),
    programId: PublicKey = new PublicKey(
      'DDN7fpM4tY3ZHdgSuf8B4UBMakh4kqPzuDZHxgVyyNg'
    )
  ) {
    this.program = new Program(
      IDL,
      programId,
      new ReadonlyProvider(connection)
    );
  }

  get programId(): PublicKey {
    return this.program.programId;
  }

  get connection(): Connection {
    return this.program.provider.connection;
  }

  async createRootInstruction({
    splGovernanceId,
    realmId,
    realmData,
    realmConfigData,
    side,
    payer,
  }: {
    splGovernanceId?: PublicKey;
    realmId: PublicKey;
    realmData?: Realm;
    realmConfigData?: RealmConfigAccount;
    side: 'community' | 'council';
    payer: PublicKey;
  }): Promise<TransactionInstruction> {
    if (!realmData) {
      const {account, owner} = await getRealm(this.connection, realmId);
      if (splGovernanceId && !owner.equals(splGovernanceId)) {
        throw new Error(`Realm ${realmId} is not owned by ${splGovernanceId}`);
      }
      realmData = account;
      splGovernanceId = owner;
    }
    if (!splGovernanceId) {
      throw new Error('splGovernanceId is required');
    }
    if (!realmConfigData) {
      const {account} = await getRealmConfig(
        this.connection,
        await getRealmConfigAddress(splGovernanceId, realmId)
      );
      realmConfigData = account;
    }

    const governingTokenMint =
      side === 'community'
        ? realmData.communityMint
        : realmData.config.councilMint!;
    if (!governingTokenMint) {
      throw new Error(`Realm ${realmId} does not have a ${side} mint`);
    }

    const [rootAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('root', 'utf-8'),
        realmId.toBuffer(),
        governingTokenMint.toBuffer(),
      ],
      this.program.programId
    );
    const [maxVoterWeightAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('max-voter-weight', 'utf-8'), rootAddress.toBuffer()],
      this.program.programId
    );

    const extraAccounts: AccountMeta[] = [
      {
        pubkey: realmData.communityMint,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: await getTokenHoldingAddress(
          splGovernanceId,
          realmId,
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
          realmId,
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

    return await this.program.methods
      .createRoot()
      .accountsStrict({
        root: rootAddress,
        realm: realmId,
        realmConfig: await getRealmConfigAddress(splGovernanceId, realmId),
        governingTokenMint,
        realmAuthority: realmData.authority!,
        maxVoterWeight: maxVoterWeightAddress,
        payer,
        governanceProgram: splGovernanceId,
        systemProgram: SystemProgram.programId,
        voteAggregatorProgram: this.program.programId,
      })
      .remainingAccounts(extraAccounts)
      .instruction();
  }
}
