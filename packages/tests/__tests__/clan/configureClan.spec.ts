import {startTest} from '../../dev/startTest';
import {
  ConfigureClanTestData,
  parseLogsEvent,
  configureClanTestData,
} from '../../src';
import {ClanTester} from '../../src/VoteAggregator';
import {Keypair, PublicKey} from '@solana/web3.js';

describe('Configure clan instructions', () => {
  it.each(
    configureClanTestData.filter(
      ({error, newName}) => !error && newName !== undefined
    )
  )(
    'Sets the name',
    async ({clan, clanAuthority, newName}: ConfigureClanTestData) => {
      const clanAccount = ClanTester.clanAccount(clan);
      const {testContext, program} = await startTest({
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

      const tx = await program.methods
        .setClanName(newName!)
        .accountsStrict({
          clan: clan.address,
          clanAuthority: clanAuthority.publicKey,
        })
        .transaction();
      tx.recentBlockhash = testContext.lastBlockhash;
      tx.feePayer = testContext.payer.publicKey;
      tx.sign(testContext.payer, clanAuthority);

      await expect(
        testContext.banksClient
          .processTransaction(tx)
          .then(meta => parseLogsEvent(program, meta.logMessages))
      ).resolves.toStrictEqual([
        {
          name: 'ClanNameChanged',
          data: {
            clan: clan.address,
            oldName: clan.name,
            newName,
          },
        },
      ]);

      await expect(
        program.account.clan.fetch(clan.address)
      ).resolves.toStrictEqual({
        ...clanAccount,
        name: newName!,
      });
    }
  );

  it.each(
    configureClanTestData.filter(
      ({error, newDescription: description}) =>
        !error && description !== undefined
    )
  )(
    'Sets the description',
    async ({clan, clanAuthority, newDescription}: ConfigureClanTestData) => {
      const clanAccount = ClanTester.clanAccount(clan);
      const {testContext, program} = await startTest({
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

      const tx = await program.methods
        .setClanDescription(newDescription!)
        .accountsStrict({
          clan: clan.address,
          clanAuthority: clanAuthority.publicKey,
        })
        .transaction();
      tx.recentBlockhash = testContext.lastBlockhash;
      tx.feePayer = testContext.payer.publicKey;
      tx.sign(testContext.payer, clanAuthority);

      await expect(
        testContext.banksClient
          .processTransaction(tx)
          .then(meta => parseLogsEvent(program, meta.logMessages))
      ).resolves.toStrictEqual([
        {
          name: 'ClanDescriptionChanged',
          data: {
            clan: clan.address,
            oldDescription: clan.description,
            newDescription,
          },
        },
      ]);

      await expect(
        program.account.clan.fetch(clan.address)
      ).resolves.toStrictEqual({
        ...clanAccount,
        description: newDescription!,
      });
    }
  );
});
