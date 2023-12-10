import {BN, Idl, Program} from '@coral-xyz/anchor';
import {IdlEvent} from '@coral-xyz/anchor/dist/cjs/idl';
import {Keypair, PublicKey} from '@solana/web3.js';
import assert from 'assert';

export const buildKeypair: (pub: string, secret: number[]) => Keypair = (
  pub,
  secret
) => {
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secret));
  assert(keypair.publicKey.equals(new PublicKey(pub)));
  return keypair;
};

export const resizeBN: (bn: BN, length?: number) => BN = (bn, length = 8) => {
  let buf = bn.toBuffer();
  if (buf.length < length) {
    buf = Buffer.concat([Buffer.alloc(length - buf.length), buf]);
  }
  return new BN(buf);
};

export function parseLogLine<P extends Idl, T>(
  program: Program<P>,
  log: string
) {
  const PROGRAM_LOG = 'Program log: ';
  const PROGRAM_DATA = 'Program data: ';
  const PROGRAM_LOG_START_INDEX = PROGRAM_LOG.length;
  const PROGRAM_DATA_START_INDEX = PROGRAM_DATA.length;

  if (log.startsWith(PROGRAM_LOG) || log.startsWith(PROGRAM_DATA)) {
    const logStr = log.startsWith(PROGRAM_LOG)
      ? log.slice(PROGRAM_LOG_START_INDEX)
      : log.slice(PROGRAM_DATA_START_INDEX);
    return program.coder.events.decode<IdlEvent, T>(logStr);
  }
  return null;
}

export function parseLogsEvent<P extends Idl>(
  program: Program<P>,
  logs: string[]
) {
  return logs.map(l => parseLogLine(program, l)?.data).find(e => e);
}
