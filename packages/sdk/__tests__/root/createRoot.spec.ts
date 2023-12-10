import {describe, it, expect} from 'bun:test';
import {
  CreateRootTestData,
  successfulCreateRootTestData,
} from 'vote-aggregator-tests';
import {VoteAggregatorSdk} from '../../src';
import {PublicKey} from '@solana/web3.js';

describe('create_root instruction', () => {
  it.each(successfulCreateRootTestData)(
    'Works for community side',
    async (realmData: CreateRootTestData) => {
      const sdk = new VoteAggregatorSdk();
      expect(
        sdk.createRootInstruction({
          splGovernanceId: realmData.splGovernanceId,
          realmId: realmData.id,
          realmData: realmData.splRealmData(),
          realmConfigData: realmData.splRealmConfigData(),
          side: 'community',
          payer: PublicKey.default,
        })
      ).resolves.toMatchSnapshot();
    }
  );

  it.each(
    successfulCreateRootTestData.filter(({realm}) => realm.config.councilMint)
  )('Works for council side', async (realmData: CreateRootTestData) => {
    const sdk = new VoteAggregatorSdk();
    expect(
      sdk.createRootInstruction({
        splGovernanceId: realmData.splGovernanceId,
        realmId: realmData.id,
        realmData: realmData.splRealmData(),
        realmConfigData: realmData.splRealmConfigData(),
        side: 'council',
        payer: PublicKey.default,
      })
    ).resolves.toMatchSnapshot();
  });
});
