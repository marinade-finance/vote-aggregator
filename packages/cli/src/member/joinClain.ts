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
  const memberAddress = sdk.member.memberAddress({
    rootAddress: clanData.root,
    owner: ownerAddress,
  })[0];
  const memberData = await sdk.member.fetchMember({memberAddress});

  let memberVoterWeightAddress: PublicKey;
  if (memberVoterWeight) {
    memberVoterWeightAddress = await parsePubkey(memberVoterWeight);
  } else {
    memberVoterWeightAddress = (
      await sdk.member.findVoterWeightRecord({
        root: rootData,
        member: memberData,
      })
    ).pubkey;
  }

  const signers = [];
  if (ownerKp) {
    signers.push(ownerKp);
  }
  await execute({
    instructions: [
      await sdk.member.joinClanInstruction({
        root: rootData,
        member: memberData,
        clanAddress: clanAddress,
        memberVoterWeightAddress,
      }),
    ],
    signers,
  });
};
