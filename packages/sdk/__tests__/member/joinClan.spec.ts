import {describe, it, expect} from 'bun:test';
import {
  ClanTester,
  JoinClanTestData,
  MemberTester,
  RealmTester,
  RootTester,
  joinClanTestData,
} from 'vote-aggregator-tests';
import {VoteAggregatorSdk} from '../../src';

describe('join_clan instruction', () => {
  it.each(joinClanTestData.filter(({error}) => !error))(
    'Works',
    async ({
      realm,
      root,
      member,
      memberVoterWeight,
      clan,
    }: JoinClanTestData) => {
      const realmTester = new RealmTester(realm);
      const rootTester = new RootTester({
        ...root,
        realm: realmTester,
      });
      const memberTester = new MemberTester({...member, root: rootTester});
      const clanTester = new ClanTester({...clan, root: rootTester});
      const sdk = new VoteAggregatorSdk();
      expect(
        sdk.member.joinClanInstruction({
          root: rootTester.root,
          member: memberTester.member,
          clanAddress: clanTester.clanAddress,
          memberVoterWeightAddress: memberVoterWeight.address,
        })
      ).resolves.toMatchSnapshot();
    }
  );
});
