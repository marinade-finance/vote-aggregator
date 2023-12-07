import {AnchorProvider, IdlAccounts, IdlTypes} from '@coral-xyz/anchor';
import {splGovernanceProgram} from '@coral-xyz/spl-governance';
import {Connection, PublicKey} from '@solana/web3.js';

// for types only
const splGovernanceIdl = () => splGovernanceProgram().idl;
export type SplGovernanceIdl = ReturnType<typeof splGovernanceIdl>;

export type RealmAccount = IdlAccounts<SplGovernanceIdl>['realmV2'];
export type RealmConfigAccount =
  IdlAccounts<SplGovernanceIdl>['realmConfigAccount'];
export type RealmConfig = IdlTypes<SplGovernanceIdl>['RealmConfig'];
export type GoverningTokenConfig =
  IdlTypes<SplGovernanceIdl>['GoverningTokenConfig'];
export type GoverningTokenType =
  IdlTypes<SplGovernanceIdl>['GoverningTokenType'];

export const buildSplGovernanceProgram = ({
  splGovernanceId,
  connection = new Connection('http://localhost:8899'),
}: {
  splGovernanceId: PublicKey;
  connection?: Connection;
}) =>
  splGovernanceProgram({
    programId: splGovernanceId,
    provider: new AnchorProvider(
      connection,
      {
        signTransaction: t => Promise.resolve(t),
        signAllTransactions: ts => Promise.resolve(ts),
        publicKey: PublicKey.default,
      },
      {}
    ),
  });
