import {BN, Program} from '@coral-xyz/anchor';
import {
  MintMaxVoteWeightSource,
  MintMaxVoteWeightSourceType,
  getRealmConfigAddress,
  getTokenHoldingAddress,
} from '@solana/spl-governance';
import {Keypair, PublicKey} from '@solana/web3.js';
import {AddedAccount} from 'solana-bankrun';
import {TOKEN_PROGRAM_ID} from '@solana/spl-token';
import {MintAccount, buildSplTokenProgram} from './splToken';
import {
  GoverningTokenType,
  RealmAccount,
  RealmConfigAccount,
  SplGovernanceIdl,
  buildSplGovernanceProgram,
} from './splGovernance';
import {resizeBN} from './utils';
import {
  Realm as SplRealm,
  RealmConfig as SplRealmConfig,
  RealmConfigAccount as SplRealmConfigAccount,
  GoverningTokenType as SplGoverningTokenType,
} from '@solana/spl-governance';

const splToken = buildSplTokenProgram();

export type GoverningTokenConfigArgs = {
  voterWeightAddin?: PublicKey | null;
  maxVoterWeightAddin?: PublicKey | null;
  tokenType?: GoverningTokenType;
};

export class RealmTestData {
  public splGovernanceId: PublicKey;
  public id: PublicKey;
  public realm: RealmAccount;
  public config: RealmConfigAccount;
  public authority?: Keypair | PublicKey;
  public communityMintAuthority?: PublicKey | Keypair;
  public councilMintAuthority?: PublicKey | Keypair;

  get authorityAddress(): PublicKey | undefined {
    return this.authority instanceof Keypair
      ? this.authority.publicKey
      : this.authority;
  }

  constructor({
    splGovernanceId,
    id,
    communityMint,
    councilMint = null,
    communityMintMaxVoterWeightSource,
    minCommunityWeightToCreateGovernance,
    authority,
    name,
    communityTokenConfig = {},
    councilTokenConfig = {},
    communityMintAuthority,
    councilMintAuthority,
  }: {
    splGovernanceId: PublicKey;
    id: PublicKey;
    communityMint: PublicKey;
    councilMint?: PublicKey | null;
    communityMintMaxVoterWeightSource: {supplyFraction: BN} | {absolute: BN};
    minCommunityWeightToCreateGovernance: BN;
    authority?: Keypair | PublicKey | undefined;
    name: string;
    communityTokenConfig?: GoverningTokenConfigArgs;
    councilTokenConfig?: GoverningTokenConfigArgs;
    communityMintAuthority?: PublicKey | Keypair;
    councilMintAuthority?: PublicKey | Keypair;
  }) {
    this.splGovernanceId = splGovernanceId;
    this.id = id;
    if ('supplyFraction' in communityMintMaxVoterWeightSource) {
      communityMintMaxVoterWeightSource.supplyFraction = resizeBN(
        communityMintMaxVoterWeightSource.supplyFraction
      );
    } else {
      communityMintMaxVoterWeightSource.absolute = resizeBN(
        communityMintMaxVoterWeightSource.absolute
      );
    }

    this.authority = authority;
    this.communityMintAuthority = communityMintAuthority;
    this.councilMintAuthority = councilMintAuthority;

    this.realm = {
      accountType: {realmV2: {}},
      communityMint,
      reserved: [0, 0, 0, 0, 0, 0],
      reservedV2: new Array<number>(128).fill(0),
      legacy1: 0,
      config: {
        councilMint,
        communityMintMaxVoterWeightSource:
          communityMintMaxVoterWeightSource as unknown as
            | {supplyFraction: [BN]}
            | {absolute: [BN]}, // anchor type bug
        minCommunityWeightToCreateGovernance: resizeBN(
          minCommunityWeightToCreateGovernance
        ),
        reserved: [0, 0, 0, 0, 0, 0],
        legacy1: 0,
        legacy2: 0,
      },
      authority: this.authorityAddress || null,
      name,
    };
    this.config = {
      accountType: {realmConfig: {}},
      realm: this.id,
      communityTokenConfig: {
        voterWeightAddin: communityTokenConfig.voterWeightAddin || null,
        maxVoterWeightAddin: communityTokenConfig.maxVoterWeightAddin || null,
        tokenType: communityTokenConfig.tokenType || {liquid: {}},
        reserved: new Array(8).fill(0),
      },
      councilTokenConfig: {
        voterWeightAddin: councilTokenConfig.voterWeightAddin || null,
        maxVoterWeightAddin: councilTokenConfig.maxVoterWeightAddin || null,
        tokenType: councilTokenConfig.tokenType || {liquid: {}},
        reserved: new Array(8).fill(0),
      },
      reserved: 0, // Dummy value for undefined schema type
    };
  }

  realmConfigId(): Promise<PublicKey> {
    return getRealmConfigAddress(this.splGovernanceId, this.id);
  }

  councilTokenHoldings(): Promise<PublicKey | null> {
    if (!this.realm.config.councilMint) return Promise.resolve(null);
    return getTokenHoldingAddress(
      this.splGovernanceId,
      this.id,
      this.realm.config.councilMint!
    );
  }

  communityTokenHoldings(): Promise<PublicKey> {
    return getTokenHoldingAddress(
      this.splGovernanceId,
      this.id,
      this.realm.communityMint
    );
  }

  async accounts(): Promise<AddedAccount[]> {
    const program = buildSplGovernanceProgram({
      splGovernanceId: this.splGovernanceId,
    });
    const realm = await program.coder.accounts.encode<RealmAccount>(
      'realmV2',
      this.realm
    );
    let config = await program.coder.accounts.encode<RealmConfigAccount>(
      'realmConfigAccount',
      this.config
    );
    config = Buffer.concat([config, Buffer.alloc(293 - config.length)]);
    const accounts = [
      {
        address: this.id,
        info: {
          executable: false,
          owner: program.programId,
          lamports: 1000000000000,
          data: realm,
        },
      },
      {
        address: await this.realmConfigId(),
        info: {
          executable: false,
          owner: program.programId,
          lamports: 1000000000000,
          data: config,
        },
      },
    ];
    if (this.communityMintAuthority) {
      const mintAuthority =
        this.communityMintAuthority instanceof Keypair
          ? this.communityMintAuthority.publicKey
          : this.communityMintAuthority;
      const mint = await splToken.coder.accounts.encode<MintAccount>('mint', {
        mintAuthority,
        supply: new BN(0),
        decimals: 0,
        isInitialized: true,
        freezeAuthority: null,
      });
      accounts.push({
        address: this.realm.communityMint,
        info: {
          executable: false,
          owner: TOKEN_PROGRAM_ID,
          lamports: 1000000000000,
          data: mint,
        },
      });
    }
    if (this.councilMintAuthority) {
      if (!this.realm.config.councilMint) {
        throw new Error('Council mint authority without council mint');
      }
      const mintAuthority =
        this.councilMintAuthority instanceof Keypair
          ? this.councilMintAuthority.publicKey
          : this.councilMintAuthority;
      const mint = await splToken.coder.accounts.encode<MintAccount>('mint', {
        mintAuthority,
        supply: new BN(0),
        decimals: 0,
        isInitialized: true,
        freezeAuthority: null,
      });
      accounts.push({
        address: this.realm.config.councilMint,
        info: {
          executable: false,
          owner: TOKEN_PROGRAM_ID,
          lamports: 1000000000000,
          data: mint,
        },
      });
    }
    return accounts;
  }

  splRealmData(): SplRealm {
    return new SplRealm({
      communityMint: this.realm.communityMint,
      reserved: new Uint8Array(6),
      config: new SplRealmConfig({
        councilMint: this.realm.config.councilMint || undefined,
        communityMintMaxVoteWeightSource: new MintMaxVoteWeightSource({
          type: this.realm.config.communityMintMaxVoterWeightSource.absolute
            ? MintMaxVoteWeightSourceType.Absolute
            : MintMaxVoteWeightSourceType.SupplyFraction,
          value: (this.realm.config.communityMintMaxVoterWeightSource
            .absolute ||
            this.realm.config.communityMintMaxVoterWeightSource
              .supplyFraction) as unknown as BN, // anchor type bug
        }),
        minCommunityTokensToCreateGovernance:
          this.realm.config.minCommunityWeightToCreateGovernance,
        reserved: new Uint8Array(6),
        useCommunityVoterWeightAddin: false,
        useMaxCommunityVoterWeightAddin: false,
      }),
      votingProposalCount: 0,
      authority: this.realm.authority || undefined,
      name: this.realm.name,
    });
  }

  splRealmConfigData(): SplRealmConfigAccount {
    return new SplRealmConfigAccount({
      realm: this.id,
      communityTokenConfig: {
        voterWeightAddin:
          this.config.communityTokenConfig.voterWeightAddin || undefined,
        maxVoterWeightAddin:
          this.config.communityTokenConfig.maxVoterWeightAddin || undefined,
        tokenType: this.config.communityTokenConfig.tokenType.liquid
          ? SplGoverningTokenType.Liquid
          : this.config.communityTokenConfig.tokenType.dormant
          ? SplGoverningTokenType.Dormant
          : SplGoverningTokenType.Membership,
        reserved: new Uint8Array(8),
      },
      councilTokenConfig: {
        voterWeightAddin:
          this.config.councilTokenConfig.voterWeightAddin || undefined,
        maxVoterWeightAddin:
          this.config.councilTokenConfig.maxVoterWeightAddin || undefined,
        tokenType: this.config.councilTokenConfig.tokenType.liquid
          ? SplGoverningTokenType.Liquid
          : this.config.councilTokenConfig.tokenType.dormant
          ? SplGoverningTokenType.Dormant
          : SplGoverningTokenType.Membership,
        reserved: new Uint8Array(8),
      },
      reserved: new Uint8Array(200),
    });
  }
}
