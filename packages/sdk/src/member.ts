import {PublicKey, SystemProgram} from '@solana/web3.js';
import {VoteAggregatorSdk} from './sdk';
import {BN, IdlAccounts} from '@coral-xyz/anchor';
import {VoteAggregator} from './vote_aggregator';
import {RootAccount} from './root';
import {SYSTEM_PROGRAM_ID} from '@solana/spl-governance';
import {VoterWeightAccount} from './clan';

export type MemberAccount = IdlAccounts<VoteAggregator>['member'];

export class MemberSdk {
  constructor(public readonly sdk: VoteAggregatorSdk) {}

  memberAddress({
    rootAddress,
    owner,
  }: {
    rootAddress: PublicKey;
    owner: PublicKey;
  }): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('member', 'utf-8'),
        rootAddress.toBuffer(),
        owner.toBuffer(),
      ],
      this.sdk.programId
    );
  }

  tokenOwnerRecordAddress({
    realmAddress,
    governingTokenMint,
    owner,
    splGovernanceId,
  }: {
    realmAddress: PublicKey;
    governingTokenMint: PublicKey;
    owner: PublicKey;
    splGovernanceId: PublicKey;
  }): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('governance', 'utf-8'),
        realmAddress.toBuffer(),
        governingTokenMint.toBuffer(),
        owner.toBuffer(),
      ],
      splGovernanceId
    );
  }

  fetchMember({
    memberAddress,
    owner,
    rootAddress,
  }: {
    memberAddress?: PublicKey;
    rootAddress?: PublicKey;
    owner?: PublicKey;
  }): Promise<MemberAccount> {
    if (!memberAddress) {
      if (!owner) {
        throw new Error('owner is required');
      }
      if (!rootAddress) {
        throw new Error('rootAddress is required');
      }
      memberAddress = this.memberAddress({rootAddress, owner})[0];
    }
    return this.sdk.program.account.member.fetch(memberAddress);
  }

  async findVoterWeightRecord({
    root,
    member,
  }: {
    root: RootAccount;
    member: MemberAccount;
  }) {
    const voterWeightAccounts = await this.sdk.connection.getProgramAccounts(
      root.votingWeightPlugin,
      {
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: '8riZd8mYDQk', // Discriminator
            },
          },
          {
            memcmp: {
              offset: 8,
              bytes: root.realm.toBase58(),
            },
          },
          {
            memcmp: {
              offset: 8 + 32,
              bytes: root.governingTokenMint.toBase58(),
            },
          },
          {
            memcmp: {
              offset: 8 + 32 + 32,
              bytes: member.owner.toBase58(),
            },
          },
        ],
      }
    );

    const voterWeightRecords = voterWeightAccounts.map(({account, pubkey}) => {
      const record = this.sdk.program.coder.accounts.decode<VoterWeightAccount>(
        'voterWeightRecord',
        account.data
      );
      return {
        record,
        pubkey,
      };
    });

    let maxExpiry: BN | null = null;
    let maxPower = new BN(0);
    let bestIndex = null;
    for (let i = 0; i < voterWeightRecords.length; i++) {
      const {record} = voterWeightRecords[i];
      if (record.weightAction || record.weightActionTarget) {
        continue;
      }
      if (
        (!record.voterWeightExpiry && maxExpiry) ||
        (maxExpiry && record.voterWeightExpiry?.gt(maxExpiry))
      ) {
        maxExpiry = record.voterWeightExpiry;
        maxPower = record.voterWeight;
        bestIndex = i;
      } else if (
        (record.voterWeightExpiry === null && maxExpiry === null) ||
        (maxExpiry && record.voterWeightExpiry?.eq(maxExpiry))
      ) {
        if (record.voterWeight.gt(maxPower)) {
          maxPower = record.voterWeight;
          bestIndex = i;
        }
      }
    }

    if (bestIndex === null) {
      throw new Error(
        `Can not find VWR for ${member.owner.toBase58()} in plugin ${root.votingWeightPlugin.toBase58()}`
      );
    }

    return voterWeightRecords[bestIndex];
  }

  async createMemberInstruction({
    rootAddress,
    root,
    owner,
    payer,
  }: {
    rootAddress: PublicKey;
    root: RootAccount;
    owner: PublicKey;
    payer: PublicKey;
  }) {
    const [tokenOwnerRecord] = this.tokenOwnerRecordAddress({
      realmAddress: root.realm,
      governingTokenMint: root.governingTokenMint,
      owner,
      splGovernanceId: root.governanceProgram,
    });
    const [member] = this.memberAddress({rootAddress, owner});
    return await this.sdk.program.methods
      .createMember()
      .accountsStrict({
        root: rootAddress,
        member,
        payer,
        systemProgram: SYSTEM_PROGRAM_ID,
        tokenOwnerRecord,
        owner,
      })
      .instruction();
  }

  async joinClanInstruction({
    root,
    member,
    clanAddress,
    memberVoterWeightAddress,
  }: {
    root: RootAccount;
    member: MemberAccount;
    clanAddress: PublicKey;
    memberVoterWeightAddress: PublicKey;
  }) {
    const [memberAddress] = this.memberAddress({
      rootAddress: member.root,
      owner: member.owner,
    });
    return await this.sdk.program.methods
      .joinClan()
      .accountsStrict({
        root: member.root,
        member: memberAddress,
        clan: clanAddress,
        memberAuthority: member.owner, // TODO delegate
        clanVoterWeightRecord: this.sdk.clan.voterWeightAddress(clanAddress)[0],
        memberTokenOwnerRecord: this.tokenOwnerRecordAddress({
          realmAddress: root.realm,
          governingTokenMint: root.governingTokenMint,
          owner: member.owner,
          splGovernanceId: root.governanceProgram,
        })[0],
        memberVoterWeightRecord: memberVoterWeightAddress,
        maxVoterWeightRecord: this.sdk.root.maxVoterWieghtAddress({
          rootAddress: member.root,
        })[0],
      })
      .instruction();
  }
}
