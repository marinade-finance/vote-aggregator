import {describe, it, expect} from 'bun:test';
import {
  CreateMemberTestData,
  successfulCreateMemberTestData,
} from 'vote-aggregator-tests';
import {VoteAggregatorSdk} from '../../src';
import {PublicKey} from '@solana/web3.js';

describe('create_member instruction', () => {
  it.each(successfulCreateMemberTestData)(
    'Works',
    async ({root, member}: CreateMemberTestData) => {
      const sdk = new VoteAggregatorSdk();
      expect(
        sdk.member.createMemberInstruction({
          rootAddress: root.rootAddress()[0],
          root: root.root,
          owner: member.owner.publicKey,
          payer: PublicKey.default,
        })
      ).resolves.toMatchSnapshot();
    }
  );
});
