import {Command} from 'commander';
import {context} from '../context';
import {execute} from '../execute';
import {parseKeypair, parsePubkey} from '../keyParser';
import {PublicKey} from '@solana/web3.js';

export const installJoinClanCLI = (program: Command) => {
  program
    .command('join-clan')
    .option('--owner <keypair>', 'Owner')
    .requiredOption('--clan <pubkey>', 'Clan')
    .option('--member-voter-weight <pubkey>', 'Member voter weight')
    .action(joinClan);
};

const joinClan = async ({
  owner,
  clan,
  memberVoterWeight,
}: {
  owner?: string;
  clan: string;
  memberVoterWeight?: string;
}) => {
  const {sdk, provider} = context!;
  const ownerKp = owner ? await parseKeypair(owner) : null;
  const ownerAddress = ownerKp?.publicKey || provider.publicKey!;
  const clanAddress = await parsePubkey(clan);
  const clanData = await sdk.clan.fetchClan(clanAddress);
  const rootData = await sdk.root.fetchRoot(clanData.root);

  let memberVoterWeightAddress: PublicKey;
  if (memberVoterWeight) {
    memberVoterWeightAddress = await parsePubkey(memberVoterWeight);
  } else {
    memberVoterWeightAddress = (
      await sdk.member.findVoterWeightRecord({
        rootData,
        owner: ownerAddress,
      })
    ).pubkey;
  }

  const signers = [];
  if (ownerKp) {
    signers.push(ownerKp);
  }
  const instructions = await sdk.member.createMemberInstructionIfNeeded({
    rootAddress: clanData.root,
    rootData,
    owner: ownerAddress,
    payer: provider.publicKey!,
  });
  instructions.push(
    await sdk.member.joinClanInstruction({
      rootData,
      memberData: {
        root: clanData.root,
        owner: ownerAddress,
      },
      clanAddress,
      memberVoterWeightAddress,
    })
  );
  await execute({
    instructions,
    signers,
  });
};
