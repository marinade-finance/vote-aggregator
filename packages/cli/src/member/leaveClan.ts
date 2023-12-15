import {Command} from 'commander';
import {context} from '../context';
import {execute} from '../execute';
import {parseKeypair, parsePubkey} from '../keyParser';
import {RealmSide} from 'vote-aggregator-sdk';
import {getRealm} from '@solana/spl-governance';

export const installLeaveClanCLI = (program: Command) => {
  program
    .command('leave-clan')
    .requiredOption('--realm <pubkey>', 'Realm address')
    .option('--side <string>', 'Side', 'community')
    .option('--owner <keypair>', 'Owner')
    .action(leaveClan);
};

const leaveClan = async ({
  realm,
  side,
  owner,
}: {
  realm: string;
  side: RealmSide;
  owner?: string;
}) => {
  const {sdk, provider} = context!;
  const ownerKp = owner ? await parseKeypair(owner) : null;
  const ownerAddress = ownerKp?.publicKey || provider.publicKey!;
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
  const memberAddress = sdk.member.memberAddress({
    rootAddress,
    owner: ownerAddress,
  })[0];
  const memberData = await sdk.member.fetchMember({memberAddress});

  const signers = [];
  if (ownerKp) {
    signers.push(ownerKp);
  }
  await execute({
    instructions: [
      await sdk.member.leaveClanInstruction({
        member: memberData,
      }),
    ],
    signers,
  });
};
