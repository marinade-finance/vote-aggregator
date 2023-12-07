import {describe, it, expect} from 'bun:test';
import {
  CreateRootTestData,
  successfulCreateRootTestData,
} from 'vote-aggregator-tests';
import {VoteAggregatorSdk} from '../src';
import {PublicKey} from '@solana/web3.js';

describe('create_root instruction', () => {
  it.each(successfulCreateRootTestData)(
    'Works for community side',
    async ({realm, splGovernanceId}: CreateRootTestData) => {
      const sdk = new VoteAggregatorSdk();
      expect(
        sdk.createRootInstruction({
          splGovernanceId,
          realmId: realm.id,
          realmData: realm.splRealmData(),
          realmConfigData: realm.splRealmConfigData(),
          side: 'community',
          payer: PublicKey.default,
        })
      ).resolves.toMatchSnapshot();
    }
  );

  it.each(
    successfulCreateRootTestData.filter(
      ({realm}) => realm.realm.config.councilMint
    )
  )(
    'Works for council side',
    async ({realm, splGovernanceId}: CreateRootTestData) => {
      const sdk = new VoteAggregatorSdk();
      expect(
        sdk.createRootInstruction({
          splGovernanceId,
          realmId: realm.id,
          realmData: realm.splRealmData(),
          realmConfigData: realm.splRealmConfigData(),
          side: 'council',
          payer: PublicKey.default,
        })
      ).resolves.toMatchSnapshot();
    }
  );
});
