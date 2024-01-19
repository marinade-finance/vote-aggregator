import {
  GetProgramAccountsFilter,
  PublicKey,
  SystemProgram,
} from '@solana/web3.js';
import {VoteAggregatorSdk} from './sdk';
import {IdlAccounts, ProgramAccount} from '@coral-xyz/anchor';
import {VoteAggregator} from './vote_aggregator';
import {RootAccount} from './root';
import {
  SYSTEM_PROGRAM_ID,
  TokenOwnerRecord,
  getTokenOwnerRecord,
} from '@solana/spl-governance';

export type ClanAccount = IdlAccounts<VoteAggregator>['clan'];
export type VoterWeightAccount =
  IdlAccounts<VoteAggregator>['voterWeightRecord'];

export class ClanSdk {
  constructor(public readonly sdk: VoteAggregatorSdk) {}

  voterAuthority({clanAddress}: {clanAddress: PublicKey}): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('voter-authority', 'utf-8'), clanAddress.toBuffer()],
      this.sdk.programId
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
      this.sdk.programId
    );
  }

  fetchClan(clanAddress: PublicKey): Promise<ClanAccount> {
    return this.sdk.program.account.clan.fetch(clanAddress);
  }

  fetchClans({
    root,
    owner,
    delegate,
    voterAuthority,
    tokenOwnerRecord,
    voterWeightRecord,
  }: {
    root?: PublicKey;
    owner?: PublicKey;
    delegate?: PublicKey;
    voterAuthority?: PublicKey;
    tokenOwnerRecord?: PublicKey;
    voterWeightRecord?: PublicKey;
  }): Promise<ProgramAccount<ClanAccount>[]> {
    let filter: GetProgramAccountsFilter[] | undefined;

    if (root) {
      if (!filter) {
        filter = [];
      }
      filter.push({
        memcmp: {
          offset: 8,
          bytes: root.toBase58(),
        },
      });
    }

    if (owner) {
      if (!filter) {
        filter = [];
      }
      filter.push({
        memcmp: {
          offset: 40,
          bytes: owner.toBase58(),
        },
      });
    }

    if (delegate) {
      if (!filter) {
        filter = [];
      }
      filter.push({
        memcmp: {
          offset: 72,
          bytes: delegate.toBase58(),
        },
      });
    }

    if (voterAuthority) {
      if (!filter) {
        filter = [];
      }
      filter.push({
        memcmp: {
          offset: 104,
          bytes: voterAuthority.toBase58(),
        },
      });
    }

    if (tokenOwnerRecord) {
      if (!filter) {
        filter = [];
      }
      filter.push({
        memcmp: {
          offset: 136,
          bytes: tokenOwnerRecord.toBase58(),
        },
      });
    }

    if (voterWeightRecord) {
      if (!filter) {
        filter = [];
      }
      filter.push({
        memcmp: {
          offset: 168,
          bytes: voterWeightRecord.toBase58(),
        },
      });
    }

    return this.sdk.program.account.clan.all(filter);
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
    return this.sdk.program.account.voterWeightRecord.fetch(voterWeightAddress);
  }

  async fetchTokenOwnerRecord({
    root,
    clanAddress,
  }: {
    root: RootAccount;
    clanAddress: PublicKey;
  }): Promise<TokenOwnerRecord> {
    const [address] = this.tokenOwnerRecordAddress({
      realmAddress: root.realm,
      governingTokenMint: root.governingTokenMint,
      clanAddress,
      splGovernanceId: root.governanceProgram,
    });
    return (await getTokenOwnerRecord(this.sdk.connection, address)).account;
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
    return await this.sdk.program.methods
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

  async setClanOwnerInstruction({
    clanAddress,
    owner,
    newOwner,
  }: {
    clanAddress: PublicKey;
    owner: PublicKey;
    newOwner: PublicKey;
  }) {
    return await this.sdk.program.methods
      .setClanOwner(newOwner)
      .accountsStrict({
        clan: clanAddress,
        owner,
      })
      .instruction();
  }

  async resizeClanInstruction({
    clanAddress,
    clanAuthority,
    payer,
    size,
  }: {
    clanAddress: PublicKey;
    clanAuthority: PublicKey;
    payer: PublicKey;
    size: number;
  }) {
    return await this.sdk.program.methods
      .resizeClan(size)
      .accountsStrict({
        clan: clanAddress,
        payer,
        systemProgram: SYSTEM_PROGRAM_ID,
        clanAuthority,
      })
      .instruction();
  }

  async setClanNameInstruction({
    clanAddress,
    clanAuthority,
    name,
  }: {
    clanAddress: PublicKey;
    clanAuthority: PublicKey;
    name: string;
  }) {
    return await this.sdk.program.methods
      .setClanName(name)
      .accountsStrict({
        clan: clanAddress,
        clanAuthority,
      })
      .instruction();
  }

  async setClanDescriptionInstruction({
    clanAddress,
    clanAuthority,
    description,
  }: {
    clanAddress: PublicKey;
    clanAuthority: PublicKey;
    description: string;
  }) {
    return await this.sdk.program.methods
      .setClanDescription(description)
      .accountsStrict({
        clan: clanAddress,
        clanAuthority,
      })
      .instruction();
  }

  async setVotingDelegateInstruction({
    rootAddress,
    root,
    clanAddress,
    clanAuthority,
    newVotingDelegate,
  }: {
    rootAddress: PublicKey;
    root: RootAccount;
    clanAddress: PublicKey;
    clanAuthority: PublicKey;
    newVotingDelegate: PublicKey | null;
  }) {
    const [voterAuthority] = this.voterAuthority({clanAddress});
    const [tokenOwnerRecord] = this.tokenOwnerRecordAddress({
      realmAddress: root.realm,
      governingTokenMint: root.governingTokenMint,
      clanAddress,
      splGovernanceId: root.governanceProgram,
    });
    return await this.sdk.program.methods
      .setVotingDelegate(newVotingDelegate || PublicKey.default)
      .accountsStrict({
        root: rootAddress,
        clan: clanAddress,
        governanceProgram: root.governanceProgram,
        voterAuthority,
        tokenOwnerRecord,
        clanAuthority,
      })
      .instruction();
  }
}
