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
import {Keypair, PublicKey} from '@solana/web3.js';
import {buildSplGovernanceProgram} from 'vote-aggregator-tests';
import {
  CreateRootTestData,
  resizeBN,
  successfulCreateRootTestData,
} from 'vote-aggregator-tests';
import {BN} from '@coral-xyz/anchor';
import {context} from '../../src/context';
import {cli} from '../../src/cli';

describe('create-root command', () => {
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
    async (realmData: CreateRootTestData) => {
      const {provider} = await startTest({
        splGovernanceId: realmData.splGovernanceId,
        accounts: await realmData.accounts(),
      });
      const splGovernance = buildSplGovernanceProgram({
        splGovernanceId: realmData.splGovernanceId,
        connection: provider.connection,
      });
      const {sdk} = context!;

      expect(
        cli()
          .exitOverride(err => {
            throw err;
          })
          .parseAsync(
            [
              'create-root',
              '--realm',
              realmData.id.toString(),
              '--side',
              'community',
              '--realm-authority',
              '[' + (realmData.authority as Keypair).secretKey.toString() + ']',
            ],
            {from: 'user'}
          )
      ).resolves.toBeTruthy();
      expect(stdout.mock.calls).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([expect.stringMatching(/^Success/)]),
        ])
      );

      const [rootAddress, rootBump] = sdk.root.rootAddress({
        realmAddress: realmData.id,
        governingTokenMint: realmData.realm.communityMint,
      });

      const [maxVoterWeightAddress, maxVoterWeightBump] =
        sdk.root.maxVoterWieghtAddress({rootAddress});

      expect(sdk.root.fetchRoot(rootAddress)).resolves.toStrictEqual({
        realm: realmData.id,
        governanceProgram: realmData.splGovernanceId,
        governingTokenMint: realmData.realm.communityMint,
        votingWeightPlugin:
          realmData.config.communityTokenConfig.voterWeightAddin ||
          PublicKey.default,
        maxProposalLifetime: resizeBN(new BN(0)),
        bumps: {
          root: rootBump,
          maxVoterWeight: maxVoterWeightBump,
        },
        clanCount: resizeBN(new BN(0)),
        memberCount: resizeBN(new BN(0)),
      });
      expect(
        splGovernance.account.realmV2.fetch(realmData.id)
      ).resolves.toStrictEqual(realmData.realm);
      expect(
        splGovernance.account.realmConfigAccount.fetch(
          await realmData.realmConfigId()
        )
      ).resolves.toStrictEqual({
        ...realmData.config,
        communityTokenConfig: {
          ...realmData.config.communityTokenConfig,
          voterWeightAddin: sdk.programId,
        },
      });

      expect(
        sdk.root.fetchMaxVoterWeight({maxVoterWeightAddress})
      ).resolves.toStrictEqual({
        realm: realmData.id,
        governingTokenMint: realmData.realm.communityMint,
        maxVoterWeight: resizeBN(new BN(0)),
        maxVoterWeightExpiry: null,
        reserved: [0, 0, 0, 0, 0, 0, 0, 0],
      });
    }
  );

  it.each(
    successfulCreateRootTestData.filter(({realm}) => realm.config.councilMint)
  )('Works for council side', async (realmData: CreateRootTestData) => {
    const {provider} = await startTest({
      splGovernanceId: realmData.splGovernanceId,
      accounts: await realmData.accounts(),
    });
    const splGovernance = buildSplGovernanceProgram({
      splGovernanceId: realmData.splGovernanceId,
      connection: provider.connection,
    });
    const {sdk} = context!;

    expect(
      cli()
        .exitOverride(err => {
          throw err;
        })
        .parseAsync(
          [
            'create-root',
            '--realm',
            realmData.id.toString(),
            '--side',
            'council',
            '--realm-authority',
            '[' + (realmData.authority as Keypair).secretKey.toString() + ']',
          ],
          {from: 'user'}
        )
    ).resolves.toBeTruthy();
    expect(stdout.mock.calls).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([expect.stringMatching(/^Success/)]),
      ])
    );

    const [rootAddress, rootBump] = sdk.root.rootAddress({
      realmAddress: realmData.id,
      governingTokenMint: realmData.realm.config.councilMint!,
    });

    const [maxVoterWeightAddress, maxVoterWeightBump] =
      sdk.root.maxVoterWieghtAddress({rootAddress});

    expect(sdk.root.fetchRoot(rootAddress)).resolves.toStrictEqual({
      realm: realmData.id,
      governanceProgram: realmData.splGovernanceId,
      governingTokenMint: realmData.realm.config.councilMint!,
      votingWeightPlugin:
        realmData.config.councilTokenConfig.voterWeightAddin ||
        PublicKey.default,
      maxProposalLifetime: resizeBN(new BN(0)),
      bumps: {
        root: rootBump,
        maxVoterWeight: maxVoterWeightBump,
      },
      clanCount: resizeBN(new BN(0)),
      memberCount: resizeBN(new BN(0)),
    });
    expect(
      splGovernance.account.realmV2.fetch(realmData.id)
    ).resolves.toStrictEqual(realmData.realm);
    expect(
      splGovernance.account.realmConfigAccount.fetch(
        await realmData.realmConfigId()
      )
    ).resolves.toStrictEqual({
      ...realmData.config,
      councilTokenConfig: {
        ...realmData.config.councilTokenConfig,
        voterWeightAddin: sdk.programId,
      },
    });

    expect(
      sdk.root.fetchMaxVoterWeight({maxVoterWeightAddress})
    ).resolves.toStrictEqual({
      realm: realmData.id,
      governingTokenMint: realmData.realm.config.councilMint!,
      maxVoterWeight: resizeBN(new BN(0)),
      maxVoterWeightExpiry: null,
      reserved: [0, 0, 0, 0, 0, 0, 0, 0],
    });
  });
});
