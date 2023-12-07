import {BN} from '@coral-xyz/anchor';
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
