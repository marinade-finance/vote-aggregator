import {Command} from 'commander';
import {context} from '../context';
import {execute} from '../execute';
import {parseKeypair, parsePubkey} from '../keyParser';

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
  side: string;
  realmAuthority?: string;
}) => {
  const {sdk, provider} = context!;
  const signers = [];
  if (realmAuthority) {
    signers.push(await parseKeypair(realmAuthority));
  }
  await execute({
    instructions: [
      await sdk.createRootInstruction({
        realmId: await parsePubkey(realm),
        side: side as 'community' | 'council',
        payer: provider.publicKey!,
      }),
    ],
    signers,
  });
};
