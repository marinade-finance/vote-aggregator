import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  spyOn,
  Mock,
} from 'bun:test';
import {startTest} from '../../dev/startTest';
import {PublicKey} from '@solana/web3.js';
import {
  CreateMemberTestData,
  RealmTester,
  RootTester,
  resizeBN,
  createMemberTestData,
} from 'vote-aggregator-tests';
import {BN} from '@coral-xyz/anchor';
import {context} from '../../src/context';
import {cli} from '../../src/cli';

describe('create-member command', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  let stdout: Mock<(message?: any, ...optionalParams: any[]) => void>;

  beforeEach(() => {
    stdout = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    stdout.mockRestore();
  });

  it.each(createMemberTestData.filter(({error}) => !error))(
    'Works',
    async ({realm, root, member}: CreateMemberTestData) => {
      const realmTester = new RealmTester(realm);
      const rootTester = new RootTester({
        ...root,
        realm: realmTester,
      });
      await startTest({
        splGovernanceId: rootTester.splGovernanceId,
        accounts: [
          ...(await rootTester.realm.accounts()),
          ...(await rootTester.accounts()),
          await rootTester.realm.tokenOwnerRecord({
            owner: member.owner.publicKey,
            side: root.side,
          }),
        ],
      });
      const {sdk} = context!;

      expect(
        cli()
          .exitOverride((err: Error) => {
            throw err;
          })
          .parseAsync(
            [
              'create-member',
              '--realm',
              rootTester.realm.realmAddress.toString(),
              '--side',
              rootTester.side,
              '--owner',
              '[' + member.owner.secretKey.toString() + ']',
            ],
            {from: 'user'}
          )
      ).resolves.toBeTruthy();
      expect(stdout.mock.calls).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([expect.stringMatching(/^Success/)]),
        ])
      );

      const [memberAddress, memberAddressBump] = sdk.member.memberAddress({
        rootAddress: rootTester.rootAddress[0],
        owner: member.owner.publicKey,
      });

      const [tokenOwnerRecord, tokenOwnerRecordBump] =
        sdk.member.tokenOwnerRecordAddress({
          realmAddress: rootTester.realm.realmAddress,
          governingTokenMint: rootTester.governingTokenMint,
          owner: member.owner.publicKey,
          splGovernanceId: rootTester.splGovernanceId,
        });

      expect(sdk.member.fetchMember({memberAddress})).resolves.toStrictEqual({
        root: rootTester.rootAddress[0],
        owner: member.owner.publicKey,
        delegate: PublicKey.default,
        tokenOwnerRecord,
        bumps: {
          address: memberAddressBump,
          tokenOwnerRecord: tokenOwnerRecordBump,
        },
        clan: PublicKey.default,
        clanLeavingTime: new BN('9223372036854775807'), // i64::MAX
        voterWeightRecord: PublicKey.default,
        voterWeight: resizeBN(new BN(0)),
        voterWeightExpiry: null,
      });

      expect(
        sdk.root.fetchRoot(rootTester.rootAddress[0])
      ).resolves.toMatchObject({
        clanCount: resizeBN(new BN(0)),
        memberCount: resizeBN(new BN(1)),
      });
    }
  );
});
