import {describe, it, expect} from 'bun:test';
import {
  ConfigureClanTestData,
  configureClanTestData,
} from 'vote-aggregator-tests';
import {Keypair} from '@solana/web3.js';
import {VoteAggregatorSdk} from '../../src';

describe('Configure clan instructions', () => {
  it.each(
    configureClanTestData.filter(
      ({error, newName}) => !error && newName !== undefined
    )
  )(
    'Sets the name',
    async ({clan, clanAuthority, newName}: ConfigureClanTestData) => {
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

      const sdk = new VoteAggregatorSdk();
      expect(
        sdk.clan.setClanNameInstruction({
          clanAddress: clan.address,
          clanAuthority: clanAuthority.publicKey,
          name: newName!,
        })
      ).resolves.toMatchSnapshot();
    }
  );

  it.each(
    configureClanTestData.filter(
      ({error, newDescription}) => !error && newDescription !== undefined
    )
  )(
    'Sets the description',
    async ({clan, clanAuthority, newDescription}: ConfigureClanTestData) => {
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

      const sdk = new VoteAggregatorSdk();
      expect(
        sdk.clan.setClanDescriptionInstruction({
          clanAddress: clan.address,
          clanAuthority: clanAuthority.publicKey,
          description: newDescription!,
        })
      ).resolves.toMatchSnapshot();
    }
  );
});
