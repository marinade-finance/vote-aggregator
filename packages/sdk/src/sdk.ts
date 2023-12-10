import {IdlAccounts, Program, Provider} from '@coral-xyz/anchor';
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

export type RealmSide = 'community' | 'council';
export type RootAccount = IdlAccounts<VoteAggregator>['root'];
export type MaxVoterWeightAccount =
  IdlAccounts<VoteAggregator>['maxVoterWeightRecord'];
export type ClanAccount = IdlAccounts<VoteAggregator>['clan'];
export type VoterWeightAccount =
  IdlAccounts<VoteAggregator>['voterWeightRecord'];

export class VoteAggregatorSdk {
  program: Program<VoteAggregator>;

  constructor(
    connection: Connection = new Connection('http://localhost:8899'),
    programId: PublicKey = new PublicKey(
      'VoTaGDreyne7jk59uwbgRRbaAzxvNbyNipaJMrRXhjT'
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

  rootAddress({
    realmId,
    governingTokenMint,
  }: {
    realmId: PublicKey;
    governingTokenMint: PublicKey;
  }): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('root', 'utf-8'),
        realmId.toBuffer(),
        governingTokenMint.toBuffer(),
      ],
      this.programId
    );
  }

  maxVoterWieghtAddress({
    rootAddress,
  }: {
    rootAddress: PublicKey;
  }): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('max-voter-weight', 'utf-8'), rootAddress.toBuffer()],
      this.programId
    );
  }

  voterAuthority({clanAddress}: {clanAddress: PublicKey}): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('voter-authority', 'utf-8'), clanAddress.toBuffer()],
      this.programId
    );
  }

  tokenOwnerRecordAddress({
    realmAddress,
    governingTokenMint,
    clanAddress,
    voterAuthority,
    splGovernanceId,
  }: {
    realmAddress: PublicKey;
    governingTokenMint: PublicKey;
    clanAddress?: PublicKey;
    voterAuthority?: PublicKey;
    splGovernanceId: PublicKey;
  }): [PublicKey, number] {
    if (!voterAuthority) {
      if (!clanAddress) {
        throw new Error('clanAddress is required');
      }
      voterAuthority = this.voterAuthority({clanAddress})[0];
    }
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('governance', 'utf-8'),
        realmAddress.toBuffer(),
        governingTokenMint.toBuffer(),
        voterAuthority.toBuffer(),
      ],
      splGovernanceId
    );
  }

  voterWeightAddress(clanAddress: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('voter-weight', 'utf-8'), clanAddress.toBuffer()],
      this.programId
    );
  }

  fetchRoot(rootAddress: PublicKey): Promise<RootAccount> {
    return this.program.account.root.fetch(rootAddress);
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
    return this.program.account.maxVoterWeightRecord.fetch(
      maxVoterWeightAddress
    );
  }

  fetchClan(clanAddress: PublicKey): Promise<ClanAccount> {
    return this.program.account.clan.fetch(clanAddress);
  }

  fetchVoterWeight({
    clanAddress,
    voterWeightAddress,
  }: {
    clanAddress?: PublicKey;
    voterWeightAddress?: PublicKey;
  }): Promise<VoterWeightAccount> {
    if (!voterWeightAddress) {
      if (!clanAddress) {
        throw new Error('clanAddress is required');
      }
      voterWeightAddress = this.voterWeightAddress(clanAddress)[0];
    }
    return this.program.account.voterWeightRecord.fetch(voterWeightAddress);
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
    side: RealmSide;
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

    const [rootAddress] = this.rootAddress({realmId, governingTokenMint});
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

  async createClanInstruction({
    rootAddress,
    root,
    clanAddress,
    owner,
    payer,
  }: {
    rootAddress: PublicKey;
    root: RootAccount;
    clanAddress: PublicKey;
    owner: PublicKey;
    payer: PublicKey;
  }) {
    const [voterAuthority] = this.voterAuthority({clanAddress});
    const [tokenOwnerRecord] = this.tokenOwnerRecordAddress({
      realmAddress: root.realm,
      governingTokenMint: root.governingTokenMint,
      clanAddress,
      splGovernanceId: root.governanceProgram,
    });
    const [voterWeightRecord] = this.voterWeightAddress(clanAddress);
    return await this.program.methods
      .createClan(owner)
      .accountsStrict({
        root: rootAddress,
        clan: clanAddress,
        realm: root.realm,
        governingTokenMint: root.governingTokenMint,
        payer,
        governanceProgram: root.governanceProgram,
        systemProgram: SystemProgram.programId,
        voterAuthority,
        tokenOwnerRecord,
        voterWeightRecord,
      })
      .instruction();
  }
}
