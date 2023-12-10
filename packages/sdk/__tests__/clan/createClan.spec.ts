import {describe, it, expect} from 'bun:test';
import {
  CreateClanTestData,
  successfulCreateClanTestData,
} from 'vote-aggregator-tests';
import {VoteAggregatorSdk} from '../../src';
import {PublicKey} from '@solana/web3.js';

describe('create_clan instruction', () => {
  it.each(successfulCreateClanTestData)(
    'Works',
    async ({root, clan}: CreateClanTestData) => {
      const sdk = new VoteAggregatorSdk();
      expect(
        sdk.createClanInstruction({
          rootAddress: root.rootAddress()[0],
          root: root.root,
          clanAddress: clan.address.publicKey,
          owner: clan.owner,
          payer: PublicKey.default,
        })
      ).resolves.toMatchSnapshot();
    }
  );
});
