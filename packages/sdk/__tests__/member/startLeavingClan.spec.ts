import {describe, it, expect} from 'bun:test';
import {
  StartLeavingClanTestData,
  MemberTester,
  RealmTester,
  RootTester,
  startLeavingClanTestData,
} from 'vote-aggregator-tests';
import {VoteAggregatorSdk} from '../../src';

describe('start_leaving_clan instruction', () => {
  it.each(startLeavingClanTestData.filter(({error}) => !error))(
    'Works',
    async ({realm, root, member}: StartLeavingClanTestData) => {
      const realmTester = new RealmTester(realm);
      const rootTester = new RootTester({
        ...root,
        realm: realmTester,
      });
      const memberTester = new MemberTester({
        ...member,
        root: rootTester,
        clan: member.clan!.address,
      });
      const sdk = new VoteAggregatorSdk();
      expect(
        sdk.member.startLeavingClanInstruction({
          member: memberTester.member,
        })
      ).resolves.toMatchSnapshot();
    }
  );
});
