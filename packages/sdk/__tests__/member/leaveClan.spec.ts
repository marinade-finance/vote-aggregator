import {
  LeaveClanTestData,
  MemberTester,
  RealmTester,
  RootTester,
  leaveClanTestData,
} from 'vote-aggregator-tests';
import {VoteAggregatorSdk} from '../../src';
import {BN} from '@coral-xyz/anchor';
import {PublicKey} from '@solana/web3.js';

describe('start_leaving_clan instruction', () => {
  it.each(leaveClanTestData.filter(({error}) => !error))(
    'Works',
    async ({
      realm,
      root,
      member,
      clanIndex = 0,
      clanLeavingTimeOffset,
    }: LeaveClanTestData) => {
      const realmTester = new RealmTester(realm);
      const rootTester = new RootTester({
        ...root,
        realm: realmTester,
      });
      const currentTime = new BN(Math.floor(Date.now() / 1000));
      const membership = MemberTester.membershipTesters({
        membership: member.membership || [],
        root: rootTester,
      });
      membership[clanIndex].leavingTime ||= currentTime.add(
        clanLeavingTimeOffset!
      );
      const memberTester = new MemberTester({
        ...member,
        root: rootTester,
        membership,
      });
      const sdk = new VoteAggregatorSdk();
      const clan = memberTester.membership[clanIndex].clan;
      expect(
        sdk.member.leaveClanInstruction({
          rootData: rootTester.root,
          memberData: memberTester.member,
          clan: clan instanceof PublicKey ? clan : clan.clanAddress,
        })
      ).resolves.toMatchSnapshot();
    }
  );
});
