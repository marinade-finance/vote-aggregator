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
import {RealmTester, buildSplGovernanceProgram} from 'vote-aggregator-tests';
import {
  CreateRootTestData,
  resizeBN,
  createRootTestData,
} from 'vote-aggregator-tests';
import {BN} from '@coral-xyz/anchor';
import {context} from '../../src/context';
import {cli} from '../../src/cli';

describe('create-root command', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  let stdout: Mock<(_message?: any, ..._optionalParams: any[]) => void>;

  beforeEach(() => {
    stdout = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    stdout.mockRestore();
  });

  it.each(createRootTestData.filter(({error}) => !error))(
    'Works for community side',
    async ({realm}: CreateRootTestData) => {
      const realmTester = new RealmTester(realm);
      const {provider} = await startTest({
        splGovernanceId: realmTester.splGovernanceId,
        accounts: await realmTester.accounts(),
      });
      const splGovernance = buildSplGovernanceProgram({
        splGovernanceId: realmTester.splGovernanceId,
        connection: provider.connection,
      });
      const {sdk} = context!;

      expect(
        cli()
          .exitOverride((err: Error) => {
            throw err;
          })
          .parseAsync(
            [
              'create-root',
              '--realm',
              realmTester.realmAddress.toString(),
              '--side',
              'community',
              '--realm-authority',
              '[' +
                (realmTester.authority as Keypair).secretKey.toString() +
                ']',
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
        realmAddress: realmTester.realmAddress,
        governingTokenMint: realmTester.realm.communityMint,
      });

      const [maxVoterWeightAddress, maxVoterWeightBump] =
        sdk.root.maxVoterWieghtAddress({rootAddress});

      expect(sdk.root.fetchRoot(rootAddress)).resolves.toStrictEqual({
        realm: realmTester.realmAddress,
        governanceProgram: realmTester.splGovernanceId,
        governingTokenMint: realmTester.realm.communityMint,
        votingWeightPlugin:
          realmTester.config.communityTokenConfig.voterWeightAddin ||
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
        splGovernance.account.realmV2.fetch(realmTester.realmAddress)
      ).resolves.toStrictEqual(realmTester.realm);
      expect(
        splGovernance.account.realmConfigAccount.fetch(
          await realmTester.realmConfigId()
        )
      ).resolves.toStrictEqual({
        ...realmTester.config,
        communityTokenConfig: {
          ...realmTester.config.communityTokenConfig,
          voterWeightAddin: sdk.programId,
        },
      });

      expect(
        sdk.root.fetchMaxVoterWeight({maxVoterWeightAddress})
      ).resolves.toStrictEqual({
        realm: realmTester.realmAddress,
        governingTokenMint: realmTester.realm.communityMint,
        maxVoterWeight: resizeBN(new BN(0)),
        maxVoterWeightExpiry: null,
        reserved: [0, 0, 0, 0, 0, 0, 0, 0],
      });
    }
  );

  it.each(
    createRootTestData.filter(({realm, error}) => !error && realm.councilMint)
  )('Works for council side', async ({realm}: CreateRootTestData) => {
    const realmTester = new RealmTester(realm);
    const {provider} = await startTest({
      splGovernanceId: realmTester.splGovernanceId,
      accounts: await realmTester.accounts(),
    });
    const splGovernance = buildSplGovernanceProgram({
      splGovernanceId: realmTester.splGovernanceId,
      connection: provider.connection,
    });
    const {sdk} = context!;

    expect(
      cli()
        .exitOverride((err: Error) => {
          throw err;
        })
        .parseAsync(
          [
            'create-root',
            '--realm',
            realmTester.realmAddress.toString(),
            '--side',
            'council',
            '--realm-authority',
            '[' + (realmTester.authority as Keypair).secretKey.toString() + ']',
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
      realmAddress: realmTester.realmAddress,
      governingTokenMint: realmTester.realm.config.councilMint!,
    });

    const [maxVoterWeightAddress, maxVoterWeightBump] =
      sdk.root.maxVoterWieghtAddress({rootAddress});

    expect(sdk.root.fetchRoot(rootAddress)).resolves.toStrictEqual({
      realm: realmTester.realmAddress,
      governanceProgram: realmTester.splGovernanceId,
      governingTokenMint: realmTester.realm.config.councilMint!,
      votingWeightPlugin:
        realmTester.config.councilTokenConfig.voterWeightAddin ||
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
      splGovernance.account.realmV2.fetch(realmTester.realmAddress)
    ).resolves.toStrictEqual(realmTester.realm);
    expect(
      splGovernance.account.realmConfigAccount.fetch(
        await realmTester.realmConfigId()
      )
    ).resolves.toStrictEqual({
      ...realmTester.config,
      councilTokenConfig: {
        ...realmTester.config.councilTokenConfig,
        voterWeightAddin: sdk.programId,
      },
    });

    expect(
      sdk.root.fetchMaxVoterWeight({maxVoterWeightAddress})
    ).resolves.toStrictEqual({
      realm: realmTester.realmAddress,
      governingTokenMint: realmTester.realm.config.councilMint!,
      maxVoterWeight: resizeBN(new BN(0)),
      maxVoterWeightExpiry: null,
      reserved: [0, 0, 0, 0, 0, 0, 0, 0],
    });
  });
});
