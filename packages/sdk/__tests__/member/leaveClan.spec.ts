import {describe, it, expect} from 'bun:test';
import {
  LeaveClanTestData,
  MemberTester,
  RealmTester,
  RootTester,
  leaveClanTestData,
} from 'vote-aggregator-tests';
import {VoteAggregatorSdk} from '../../src';
import {BN} from '@coral-xyz/anchor';

describe('start_leaving_clan instruction', () => {
  it.each(leaveClanTestData.filter(({error}) => !error))(
    'Works',
    async ({realm, root, member}: LeaveClanTestData) => {
      const realmTester = new RealmTester(realm);
      const rootTester = new RootTester({
        ...root,
        realm: realmTester,
      });
      const currentTime = new BN(Math.floor(Date.now() / 1000));
      const memberTester = new MemberTester({
        ...member,
        clanLeavingTime: currentTime.add(member.clanLeavingTimeOffset!),
        root: rootTester,
        clan: member.clan!.address,
      });
      const sdk = new VoteAggregatorSdk();
      expect(
        sdk.member.leaveClanInstruction({
          rootData: rootTester.root,
          memberData: memberTester.member,
        })
      ).resolves.toMatchSnapshot();
    }
  );
});
