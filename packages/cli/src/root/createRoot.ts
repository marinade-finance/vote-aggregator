import {Command} from 'commander';
import {context} from '../context';
import {execute} from '../execute';
import {parseKeypair, parsePubkey} from '../keyParser';
import {RealmSide} from 'vote-aggregator-sdk';

export const installCreateRootCLI = (program: Command) => {
  program
    .command('create-root')
    .requiredOption('--realm <pubkey>', 'Realm address')
    .option('--side <string>', 'Side', 'community')
    .option('--realm-authority <keypair>', 'Realm authority')
    .action(createRoot);
};

const createRoot = async ({
  realm,
  side,
  realmAuthority,
}: {
  realm: string;
  side: RealmSide;
  realmAuthority?: string;
}) => {
  const {sdk, provider} = context!;
  const signers = [];
  if (realmAuthority) {
    signers.push(await parseKeypair(realmAuthority));
  }
  await execute({
    instructions: [
      await sdk.root.createRootInstruction({
        realmAddress: await parsePubkey(realm),
        side,
        payer: provider.publicKey!,
      }),
    ],
    signers,
  });
};
