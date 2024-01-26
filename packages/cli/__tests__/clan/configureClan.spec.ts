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
import {
  configureClanTestData,
  setClanOwnerTestData,
  ClanTester,
  ConfigureClanTestData,
  SetClanOwnerTestData,
} from 'vote-aggregator-tests';
import {context} from '../../src/context';
import {cli} from '../../src/cli';
import {Keypair, PublicKey} from '@solana/web3.js';

describe('set-voting-delegate command', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  let stdout: Mock<(message?: any, ...optionalParams: any[]) => void>;

  beforeEach(() => {
    stdout = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    stdout.mockRestore();
  });

  it.each(
    configureClanTestData.filter(
      ({error, newName}) => !error && newName !== undefined
    )
  )(
    'It sets clan name',
    async ({clan, clanAuthority, newName}: ConfigureClanTestData) => {
      const clanAccount = ClanTester.clanAccount(clan);
      await startTest({
        splGovernanceId: new PublicKey(
          'BdhNf6wxdcDudYT4KD4uft3nvJah1LNx7QzGKMuGoSgX'
        ), // some dummy key
        accounts: [
          await ClanTester.encodeClanAccount({
            address: clan.address,
            clan: clanAccount,
            size: clan.size,
            voteAggregatorId: new PublicKey(
              'VoTaGDreyne7jk59uwbgRRbaAzxvNbyNipaJMrRXhjT'
            ),
          }),
        ],
      });

      if (clanAuthority === 'owner') {
        if (!(clan.owner instanceof Keypair)) {
          throw new Error('Clan owner is not a keypair');
        }
        clanAuthority = clan.owner;
      } else if (clanAuthority === 'delegate') {
        if (!(clan.delegate instanceof Keypair)) {
          throw new Error('Clan delegate is not a keypair');
        }
        clanAuthority = clan.delegate;
      }
      const {sdk} = context!;

      expect(
        cli()
          .exitOverride((err: Error) => {
            throw err;
          })
          .parseAsync(
            [
              'configure-clan',
              '--clan',
              clan.address.toBase58(),
              '--authority',
              '[' + clanAuthority.secretKey.toString() + ']',
              '--set-name',
              newName!,
            ],
            {from: 'user'}
          )
      ).resolves.toBeTruthy();
      expect(stdout.mock.calls).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([expect.stringMatching(/^Success/)]),
        ])
      );
      expect(sdk.clan.fetchClan(clan.address)).resolves.toStrictEqual({
        ...clanAccount,
        name: newName!,
      });
    }
  );

  it.each(
    configureClanTestData.filter(
      ({error, newDescription}) => !error && newDescription !== undefined
    )
  )(
    'It sets clan description',
    async ({clan, clanAuthority, newDescription}: ConfigureClanTestData) => {
      const clanAccount = ClanTester.clanAccount(clan);
      await startTest({
        splGovernanceId: new PublicKey(
          'BdhNf6wxdcDudYT4KD4uft3nvJah1LNx7QzGKMuGoSgX'
        ), // some dummy key
        accounts: [
          await ClanTester.encodeClanAccount({
            address: clan.address,
            clan: clanAccount,
            size: clan.size,
            voteAggregatorId: new PublicKey(
              'VoTaGDreyne7jk59uwbgRRbaAzxvNbyNipaJMrRXhjT'
            ),
          }),
        ],
      });

      if (clanAuthority === 'owner') {
        if (!(clan.owner instanceof Keypair)) {
          throw new Error('Clan owner is not a keypair');
        }
        clanAuthority = clan.owner;
      } else if (clanAuthority === 'delegate') {
        if (!(clan.delegate instanceof Keypair)) {
          throw new Error('Clan delegate is not a keypair');
        }
        clanAuthority = clan.delegate;
      }
      const {sdk} = context!;

      expect(
        cli()
          .exitOverride((err: Error) => {
            throw err;
          })
          .parseAsync(
            [
              'configure-clan',
              '--clan',
              clan.address.toBase58(),
              '--authority',
              '[' + clanAuthority.secretKey.toString() + ']',
              '--set-description',
              newDescription!,
            ],
            {from: 'user'}
          )
      ).resolves.toBeTruthy();
      expect(stdout.mock.calls).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([expect.stringMatching(/^Success/)]),
        ])
      );
      expect(sdk.clan.fetchClan(clan.address)).resolves.toStrictEqual({
        ...clanAccount,
        description: newDescription!,
      });
    }
  );

  it.each(setClanOwnerTestData.filter(({error}) => !error))(
    'It sets clan owner',
    async ({clan, clanAuthority, newOwner}: SetClanOwnerTestData) => {
      const clanAccount = ClanTester.clanAccount(clan);
      await startTest({
        splGovernanceId: new PublicKey(
          'BdhNf6wxdcDudYT4KD4uft3nvJah1LNx7QzGKMuGoSgX'
        ), // some dummy key
        accounts: [
          await ClanTester.encodeClanAccount({
            address: clan.address,
            clan: clanAccount,
            size: clan.size,
            voteAggregatorId: new PublicKey(
              'VoTaGDreyne7jk59uwbgRRbaAzxvNbyNipaJMrRXhjT'
            ),
          }),
        ],
      });

      if (clanAuthority === 'owner') {
        if (!(clan.owner instanceof Keypair)) {
          throw new Error('Clan owner is not a keypair');
        }
        clanAuthority = clan.owner;
      }
      const {sdk} = context!;

      expect(
        cli()
          .exitOverride((err: Error) => {
            throw err;
          })
          .parseAsync(
            [
              'configure-clan',
              '--clan',
              clan.address.toBase58(),
              '--authority',
              '[' + clanAuthority.secretKey.toString() + ']',
              '--set-owner',
              newOwner.toBase58(),
            ],
            {from: 'user'}
          )
      ).resolves.toBeTruthy();
      expect(stdout.mock.calls).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([expect.stringMatching(/^Success/)]),
        ])
      );
      expect(sdk.clan.fetchClan(clan.address)).resolves.toStrictEqual({
        ...clanAccount,
        owner: newOwner,
      });
    }
  );
});
