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
  const realmAddress = await parsePubkey(realm);
  const realmData = await getRealm(provider.connection, realmAddress);
  const governingTokenMint =
    side === 'community'
      ? realmData.account.communityMint
      : realmData.account.config.councilMint!;
  const [rootAddress] = sdk.root.rootAddress({
    realmAddress,
    governingTokenMint,
  });
  const rootData = await sdk.root.fetchRoot(rootAddress);
  console.log(`Creating clan ${clanAddress.publicKey.toBase58()}`);
  await execute({
    instructions: [
      await sdk.clan.createClanInstruction({
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
