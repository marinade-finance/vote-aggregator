import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  spyOn,
  Mock,
} from 'bun:test';
import {startTest} from '../dev/startTest';
import {AccountMeta, SystemProgram} from '@solana/web3.js';
import {PublicKey} from '@solana/web3.js';
import {buildSplGovernanceProgram} from 'vote-aggregator-tests';
import {
  CreateRootTestData,
  resizeBN,
  successfulCreateRootTestData,
} from 'vote-aggregator-tests';
import {BN} from '@coral-xyz/anchor';
import {context} from '../src/context';
import {cli} from '../src/cli';

describe('create_root instruction', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stdout: Mock<(message?: any, ...optionalParams: any[]) => void>;

  beforeEach(() => {
    stdout = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    stdout.mockRestore();
  });

  it.each(successfulCreateRootTestData)(
    'Works for community side',
    async ({realm, splGovernanceId}: CreateRootTestData) => {
      let splGovernance = buildSplGovernanceProgram({splGovernanceId});
      const {provider} = await startTest({
        splGovernanceId,
        accounts: await realm.accounts(splGovernance),
      });
      // Recreate the program handle with the correct connection
      splGovernance = buildSplGovernanceProgram({
        splGovernanceId,
        connection: provider.connection,
      });
      const {sdk} = context!;

      expect(
        cli()
          .exitOverride()
          .parseAsync(
            [
              'create-root',
              '--realm',
              realm.id.toString(),
              '--side',
              'community',
              '--realm-authority',
              '[' + realm.authority!.secretKey.toString() + ']',
            ],
            {from: 'user'}
          )
      ).resolves.toBeTruthy();
      expect(stdout.mock.calls).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([expect.stringMatching(/^Success/)]),
        ])
      );

      const [rootAddress, rootBump] = sdk.rootAddress(
        realm.id,
        realm.realm.communityMint
      );

      const [, maxVoterWeightBump] = sdk.maxVoterWieghtAddress(rootAddress);

      expect(sdk.fetchRoot(rootAddress)).resolves.toStrictEqual({
        realm: realm.id,
        governanceProgram: splGovernanceId,
        governingTokenMint: realm.realm.communityMint,
        votingWeightPlugin:
          realm.config.communityTokenConfig.voterWeightAddin ||
          PublicKey.default,
        maxProposalLifetime: resizeBN(new BN(0)),
        bumps: {
          root: rootBump,
          maxVoterWeight: maxVoterWeightBump,
        },
        clanCount: resizeBN(new BN(0)),
        memeberCount: resizeBN(new BN(0)),
      });
      expect(
        splGovernance.account.realmV2.fetch(realm.id)
      ).resolves.toStrictEqual(realm.realm);
      expect(
        splGovernance.account.realmConfigAccount.fetch(
          await realm.realmConfigId(splGovernanceId)
        )
      ).resolves.toStrictEqual({
        ...realm.config,
        communityTokenConfig: {
          ...realm.config.communityTokenConfig,
          voterWeightAddin: sdk.programId,
        },
      });

      expect(sdk.fetchMaxVoterWeight(rootAddress)).resolves.toStrictEqual({
        realm: realm.id,
        governingTokenMint: realm.realm.communityMint,
        maxVoterWeight: resizeBN(new BN(0)),
        maxVoterWeightExpiry: null,
        reserved: [0, 0, 0, 0, 0, 0, 0, 0],
      });
    }
  );

  it.each(
    successfulCreateRootTestData.filter(
      ({realm}) => realm.realm.config.councilMint
    )
  )(
    'Works for council side',
    async ({realm, splGovernanceId}: CreateRootTestData) => {
      let splGovernance = buildSplGovernanceProgram({splGovernanceId});
      const {provider} = await startTest({
        splGovernanceId,
        accounts: await realm.accounts(splGovernance),
      });
      // Recreate the program handle with the correct connection
      splGovernance = buildSplGovernanceProgram({
        splGovernanceId,
        connection: provider.connection,
      });
      const {sdk} = context!;

      expect(
        cli()
          .exitOverride()
          .parseAsync(
            [
              'create-root',
              '--realm',
              realm.id.toString(),
              '--side',
              'council',
              '--realm-authority',
              '[' + realm.authority!.secretKey.toString() + ']',
            ],
            {from: 'user'}
          )
      ).resolves.toBeTruthy();
      expect(stdout.mock.calls).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([expect.stringMatching(/^Success/)]),
        ])
      );

      const [rootAddress, rootBump] = sdk.rootAddress(
        realm.id,
        realm.realm.config.councilMint!
      );

      const [, maxVoterWeightBump] = sdk.maxVoterWieghtAddress(rootAddress);

      expect(sdk.fetchRoot(rootAddress)).resolves.toStrictEqual({
        realm: realm.id,
        governanceProgram: splGovernanceId,
        governingTokenMint: realm.realm.config.councilMint!,
        votingWeightPlugin:
          realm.config.councilTokenConfig.voterWeightAddin || PublicKey.default,
        maxProposalLifetime: resizeBN(new BN(0)),
        bumps: {
          root: rootBump,
          maxVoterWeight: maxVoterWeightBump,
        },
        clanCount: resizeBN(new BN(0)),
        memeberCount: resizeBN(new BN(0)),
      });
      expect(
        splGovernance.account.realmV2.fetch(realm.id)
      ).resolves.toStrictEqual(realm.realm);
      expect(
        splGovernance.account.realmConfigAccount.fetch(
          await realm.realmConfigId(splGovernanceId)
        )
      ).resolves.toStrictEqual({
        ...realm.config,
        councilTokenConfig: {
          ...realm.config.councilTokenConfig,
          voterWeightAddin: sdk.programId,
        },
      });

      expect(sdk.fetchMaxVoterWeight(rootAddress)).resolves.toStrictEqual({
        realm: realm.id,
        governingTokenMint: realm.realm.config.councilMint!,
        maxVoterWeight: resizeBN(new BN(0)),
        maxVoterWeightExpiry: null,
        reserved: [0, 0, 0, 0, 0, 0, 0, 0],
      });
    }
  );
});
