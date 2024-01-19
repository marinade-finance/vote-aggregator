import {Command} from 'commander';
import {context} from '../context';
import {execute} from '../execute';
import {parseKeypair, parsePubkey} from '../keyParser';

export const installConfigureClanCLI = (program: Command) => {
  program
    .command('configure-clan')
    .requiredOption('--clan <pubkey>', 'Clan address')
    .option('--authority <keypair>', 'Owner')
    .option('--set-owner <pubkey>', 'New owner')
    .option('--set-name <string>', 'Name')
    .option('--set-description <string>', 'Description')
    .action(configureClan);
};

const configureClan = async ({
  clan,
  authority,
  setOwner,
  setName,
  setDescription,
}: {
  clan: string;
  authority?: string;
  setOwner?: string;
  setName?: string;
  setDescription?: string;
}) => {
  const {sdk, provider} = context!;

  const instructions = [];
  const signers = [];

  const clanAddress = await parsePubkey(clan);
  const authorityKp =
    authority !== undefined ? await parseKeypair(authority) : undefined;
  if (authorityKp) {
    signers.push(authorityKp);
  }
  const clanAuthority = authorityKp?.publicKey || provider.publicKey!;

  const clanData = await sdk.clan.fetchClan(clanAddress);

  if (setName || setDescription) {
    const name = setName ?? clanData.name;
    const description = setDescription ?? clanData.description;
    instructions.push(
      await sdk.clan.resizeClanInstruction({
        clanAddress,
        clanAuthority,
        size: 288 + name.length + description.length,
        payer: provider.publicKey!,
      })
    );

    if (setName) {
      instructions.push(
        await sdk.clan.setClanNameInstruction({
          clanAddress,
          clanAuthority,
          name: setName,
        })
      );
    }

    if (setDescription) {
      instructions.push(
        await sdk.clan.setClanDescriptionInstruction({
          clanAddress,
          clanAuthority,
          description: setDescription,
        })
      );
    }
  }

  if (setOwner) {
    const newOwner = await parsePubkey(setOwner);
    instructions.push(
      await sdk.clan.setClanOwnerInstruction({
        clanAddress,
        owner: clanAuthority,
        newOwner,
      })
    );
  }

  await execute({instructions, signers});
};
