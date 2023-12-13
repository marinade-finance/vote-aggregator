import {PublicKey, SystemProgram} from '@solana/web3.js';
import {VoteAggregatorSdk} from './sdk';
import {IdlAccounts} from '@coral-xyz/anchor';
import {VoteAggregator} from './vote_aggregator';
import {RootAccount} from './root';
import {SYSTEM_PROGRAM_ID} from '@solana/spl-governance';

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
}
