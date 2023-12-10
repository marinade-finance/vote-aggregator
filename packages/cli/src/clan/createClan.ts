import {Command} from 'commander';
import {context} from '../context';
import {execute} from '../execute';
import {parseKeypair, parsePubkey} from '../keyParser';
import {RealmSide} from 'vote-aggregator-sdk';
import {getRealm} from '@solana/spl-governance';
import {Keypair} from '@solana/web3.js';

export const installCreateClanCLI = (program: Command) => {
  program
    .command('create-clan')
    .requiredOption('--realm <pubkey>', 'Realm address')
    .option('--side <string>', 'Side', 'community')
    .option('--clan <keypair>', 'Clan address')
    .option('--owner <pubkey>', 'Owner')
    .action(createClan);
};

const createClan = async ({
  realm,
  side,
  clan,
  owner,
}: {
  realm: string;
  side: RealmSide;
  clan?: string;
  owner: string;
}) => {
  const {sdk, provider} = context!;
  const clanAddress = clan ? await parseKeypair(clan) : Keypair.generate();
  const ownerPk = owner ? await parsePubkey(owner) : provider.publicKey!;
  const realmId = await parsePubkey(realm);
  const realmData = await getRealm(provider.connection, realmId);
  const governingTokenMint =
    side === 'community'
      ? realmData.account.communityMint
      : realmData.account.config.councilMint!;
  const [rootAddress] = sdk.rootAddress({realmId, governingTokenMint});
  const rootData = await sdk.fetchRoot(rootAddress);
  await execute({
    instructions: [
      await sdk.createClanInstruction({
        rootAddress,
        root: rootData,
        clanAddress: clanAddress.publicKey,
        owner: ownerPk,
        payer: provider.publicKey!,
      }),
    ],
    signers: [clanAddress],
  });
};
