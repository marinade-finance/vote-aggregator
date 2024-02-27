import {
  ConfigureRootTestData,
  RealmTester,
  RootTester,
  configureRootTestData,
} from 'vote-aggregator-tests';
import {VoteAggregatorSdk} from '../../src';
import {Keypair} from '@solana/web3.js';
// import BN from 'bn.js';

describe('Configure root', () => {
  it.each(
    configureRootTestData.filter(
      ({error, maxProposalLifetime}) =>
        !error && maxProposalLifetime !== undefined
    )
  )(
    'Runs set_max_proposal_lifetime instruction',
    async ({realm, root, maxProposalLifetime}: ConfigureRootTestData) => {
      const realmTester = new RealmTester(realm);
      if (!(realmTester.authority instanceof Keypair)) {
        throw new Error('Realm authority keypair is required');
      }
      const rootTester = new RootTester({
        ...root,
        realm: realmTester,
      });
      const sdk = new VoteAggregatorSdk();
      expect(
        sdk.root.setMaxProposalLifetimeInstruction({
          realm: realmTester.realmAddress,
          root: rootTester.rootAddress[0],
          realmAuthority: realmTester.authorityAddress!,
          maxProposalLifetime: maxProposalLifetime!,
        })
      ).resolves.toMatchSnapshot();
    }
  );

  /*
  it.each(
    configureRootTestData.filter(
      ({error, voterWeightResetStep}) =>
        !error && voterWeightResetStep !== undefined
    )
  )(
    'Runs set_voter_weight_reset instruction',
    async ({
      realm,
      root,
      voterWeightResetStep,
      nextVoterWeightResetOffset,
    }: ConfigureRootTestData) => {
      const realmTester = new RealmTester(realm);
      if (!(realmTester.authority instanceof Keypair)) {
        throw new Error('Realm authority keypair is required');
      }
      const rootTester = new RootTester({
        ...root,
        realm: realmTester,
      });
      const sdk = new VoteAggregatorSdk();
      const currentTime = new BN(Math.floor(Date.now() / 1000));
      const newNextResetTime =
        nextVoterWeightResetOffset === null
          ? null
          : currentTime.add(nextVoterWeightResetOffset!);
      expect(
        sdk.root.setVoterWeightResetInstruction({
          realm: realmTester.realmAddress,
          root: rootTester.rootAddress[0],
          realmAuthority: realmTester.authorityAddress!,
          step: voterWeightResetStep!,
          nextResetTime: newNextResetTime,
        })
      ).resolves.toMatchSnapshot();
    }
  );
  */
});
