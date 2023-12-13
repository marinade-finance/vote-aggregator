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
  resizeBN,
  successfulCreateMemberTestData,
} from 'vote-aggregator-tests';
import {BN} from '@coral-xyz/anchor';
import {context} from '../../src/context';
import {cli} from '../../src/cli';
import {
  GovernanceAccountType,
  getTokenOwnerRecord,
} from '@solana/spl-governance';

describe('create-member command', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stdout: Mock<(message?: any, ...optionalParams: any[]) => void>;

  beforeEach(() => {
    stdout = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    stdout.mockRestore();
  });

  it.each(successfulCreateMemberTestData)(
    'Works',
    async ({root, member}: CreateMemberTestData) => {
      const {provider} = await startTest({
        splGovernanceId: root.splGovernanceId,
        accounts: [
          await root.realm.tokenOwnerRecord({
            owner: member.owner.publicKey,
            side: root.side,
          }),
          ...(await root.accounts()),
        ],
      });
      const {sdk} = context!;

      expect(
        cli()
          .exitOverride(err => {
            throw err;
          })
          .parseAsync(
            [
              'create-member',
              '--realm',
              root.realm.id.toString(),
              '--side',
              root.side,
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
        rootAddress: root.rootAddress()[0],
        owner: member.owner.publicKey,
      });

      const [tokenOwnerRecord, tokenOwnerRecordBump] =
        sdk.member.tokenOwnerRecordAddress({
          realmAddress: root.realm.id,
          governingTokenMint: root.governingTokenMint,
          owner: member.owner.publicKey,
          splGovernanceId: root.splGovernanceId,
        });

      expect(sdk.member.fetchMember({memberAddress})).resolves.toStrictEqual({
        root: root.rootAddress()[0],
        owner: member.owner.publicKey,
        delegate: PublicKey.default,
        tokenOwnerRecord,
        bumps: {
          address: memberAddressBump,
          tokenOwnerRecord: tokenOwnerRecordBump,
        },
        clan: PublicKey.default,
        clanLeavingTime: new BN(0), // resize is not needed for signed integers
      });

      expect(sdk.root.fetchRoot(root.rootAddress()[0])).resolves.toMatchObject({
        clanCount: resizeBN(new BN(0)),
        memberCount: resizeBN(new BN(1)),
      });
    }
  );
});
