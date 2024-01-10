import {PublicKey, SystemProgram} from '@solana/web3.js';
import {VoteAggregatorSdk} from './sdk';
import {IdlAccounts} from '@coral-xyz/anchor';
import {VoteAggregator} from './vote_aggregator';
import {RootAccount} from './root';
import {TokenOwnerRecord, getTokenOwnerRecord} from '@solana/spl-governance';

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
