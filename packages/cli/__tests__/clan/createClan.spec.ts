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
  CreateClanTestData,
  resizeBN,
  successfulCreateClanTestData,
} from 'vote-aggregator-tests';
import {BN} from '@coral-xyz/anchor';
import {context} from '../../src/context';
import {cli} from '../../src/cli';
import {
  GovernanceAccountType,
  getTokenOwnerRecord,
} from '@solana/spl-governance';

describe('create-clan command', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stdout: Mock<(message?: any, ...optionalParams: any[]) => void>;

  beforeEach(() => {
    stdout = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    stdout.mockRestore();
  });

  it.each(successfulCreateClanTestData)(
    'Works',
    async ({root, clan}: CreateClanTestData) => {
      const {provider} = await startTest({
        splGovernanceId: root.splGovernanceId,
        accounts: await root.accounts(),
      });
      const {sdk} = context!;

      expect(
        cli()
          .exitOverride(err => {
            throw err;
          })
          .parseAsync(
            [
              'create-clan',
              '--realm',
              root.realm.id.toString(),
              '--side',
              root.side,
              '--clan',
              '[' + clan.address.secretKey.toString() + ']',
              '--owner',
              clan.owner.toString(),
            ],
            {from: 'user'}
          )
      ).resolves.toBeTruthy();
      expect(stdout.mock.calls).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([expect.stringMatching(/^Success/)]),
        ])
      );

      const [voterAuthority, voterAuthorityBump] = sdk.voterAuthority({
        clanAddress: clan.address.publicKey,
      });
      const [tokenOwnerRecord, tokenOwnerRecordBump] =
        sdk.tokenOwnerRecordAddress({
          realmAddress: root.realm.id,
          governingTokenMint: root.governingTokenMint,
          clanAddress: clan.address.publicKey,
          splGovernanceId: root.splGovernanceId,
        });
      const [voterWeightRecord, voterWeightRecordBump] = sdk.voterWeightAddress(
        clan.address.publicKey
      );

      expect(sdk.fetchClan(clan.address.publicKey)).resolves.toStrictEqual({
        root: root.rootAddress()[0],
        owner: clan.owner,
        delegate: PublicKey.default,
        voterAuthority,
        tokenOwnerRecord,
        voterWeightRecord,
        minVotingWeightToJoin: resizeBN(new BN(0)),
        bumps: {
          voterAuthority: voterAuthorityBump,
          tokenOwnerRecord: tokenOwnerRecordBump,
          voterWeightRecord: voterWeightRecordBump,
        },
        activeMembers: resizeBN(new BN(0)),
        leavingMembers: resizeBN(new BN(0)),
        potentialVotingWeight: resizeBN(new BN(0)),
        name: '',
        description: '',
      });

      expect(
        getTokenOwnerRecord(provider.connection, tokenOwnerRecord).then(
          ({account}) => account
        )
      ).resolves.toMatchObject({
        realm: root.realm.id,
        governingTokenMint: root.governingTokenMint,
        governingTokenOwner: voterAuthority,
        governingTokenDepositAmount: resizeBN(new BN(0)),
        unrelinquishedVotesCount: 0,
        outstandingProposalCount: 0,
        version: 1,
        accountType: GovernanceAccountType.TokenOwnerRecordV1,
        governanceDelegate: undefined,
        totalVotesCount: 0,
        reserved: new Uint8Array(6),
      });

      expect(
        sdk.fetchVoterWeight({voterWeightAddress: voterWeightRecord})
      ).resolves.toStrictEqual({
        realm: root.realm.id,
        governingTokenMint: root.governingTokenMint,
        governingTokenOwner: voterAuthority,
        voterWeight: resizeBN(new BN(0)),
        voterWeightExpiry: null,
        weightAction: null,
        weightActionTarget: null,
        reserved: [0, 0, 0, 0, 0, 0, 0, 0],
      });

      expect(sdk.fetchRoot(root.rootAddress()[0])).resolves.toMatchObject({
        clanCount: resizeBN(new BN(1)),
        memberCount: resizeBN(new BN(0)),
      });
    }
  );
});
