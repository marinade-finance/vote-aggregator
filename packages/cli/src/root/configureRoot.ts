import {Command} from 'commander';
import {context} from '../context';
import {execute} from '../execute';
import {parseKeypair, parsePubkey} from '../keyParser';
import {BN} from 'bn.js';

export const installConfigureRootCLI = (program: Command) => {
  program
    .command('set-max-proposal-lifetime')
    .requiredOption('--root <pubkey>', 'Root')
    .option('--realm-authority <keypair>', 'Realm authority')
    .requiredOption('--max-proposal-lifetime <number>', 'Max proposal lifetime')
    .action(setMaxProposalLifetime);

  program
    .command('set-voter-weight-reset')
    .requiredOption('--root <pubkey>', 'Root')
    .option('--realm-authority <keypair>', 'Realm authority')
    .requiredOption('--step <number>', 'Step')
    .option('--next-reset-time <number>', 'Next voter weight reset time')
    .action(setVoterWeightReset);
};

const setMaxProposalLifetime = async ({
  root,
  realmAuthority,
  maxProposalLifetime,
}: {
  root: string;
  realmAuthority?: string;
  maxProposalLifetime?: string;
}) => {
  const {sdk, provider} = context!;
  const signers = [];
  let realmAuthorityAddress = provider.publicKey!;
  if (realmAuthority) {
    const realmAuthorityKP = await parseKeypair(realmAuthority);
    signers.push(realmAuthorityKP);
    realmAuthorityAddress = realmAuthorityKP.publicKey;
  }

  const rootAddress = await parsePubkey(root);
  const rootData = await sdk.root.fetchRoot(rootAddress);
  await execute({
    instructions: [
      await sdk.root.setMaxProposalLifetimeInstruction({
        root: await parsePubkey(root),
        realm: rootData.realm,
        realmAuthority: realmAuthorityAddress,
        maxProposalLifetime:
          (maxProposalLifetime && new BN(maxProposalLifetime)) || new BN(0),
      }),
    ],
    signers,
  });
};

const setVoterWeightReset = async ({
  root,
  realmAuthority,
  step,
  nextResetTime,
}: {
  root: string;
  realmAuthority?: string;
  step: string;
  nextResetTime?: string;
}) => {
  const {sdk, provider} = context!;
  const signers = [];
  let realmAuthorityAddress = provider.publicKey!;
  if (realmAuthority) {
    const realmAuthorityKP = await parseKeypair(realmAuthority);
    signers.push(realmAuthorityKP);
    realmAuthorityAddress = realmAuthorityKP.publicKey;
  }

  const rootAddress = await parsePubkey(root);
  const rootData = await sdk.root.fetchRoot(rootAddress);
  await execute({
    instructions: [
      await sdk.root.setVoterWeightResetInstruction({
        root: await parsePubkey(root),
        realm: rootData.realm,
        realmAuthority: realmAuthorityAddress,
        step: new BN(step),
        nextResetTime:
          nextResetTime === undefined ? null : new BN(nextResetTime),
      }),
    ],
    signers,
  });
};
