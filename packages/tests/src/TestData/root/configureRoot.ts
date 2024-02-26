import {PublicKey} from '@solana/web3.js';
import {RealmTestData} from '../../SplGovernance/realm';
import {BN} from '@coral-xyz/anchor';
import {RootTestData} from '../../VoteAggregator/root';
import {buildKeypair} from '../..';

export type ConfigureRootTestData = {
  realm: RealmTestData;
  root: RootTestData;
  maxProposalLifetime?: BN;
  voterWeightResetStep?: BN;
  nextVoterWeightResetOffset?: BN | null;
  error?: string;
};

export const configureRootTestData: ConfigureRootTestData[] = [
  {
    realm: {
      splGovernanceId: new PublicKey(
        '6VQRT3WaXjh6J2LfsYfsrTjFwDkkQhE2DVT6sPACJVBd'
      ),
      realmAddress: new PublicKey(
        'CK1VnpRfpYmGNNNnp9MDYTpKLDrwwXVbSXSMEbTzujHv'
      ),
      authority: buildKeypair(
        '91kqKkYveAy8JJgvLEcKQr8QLUN8uNUhcz34QwFDz8hn',
        [
          237, 120, 105, 249, 201, 66, 25, 103, 164, 199, 71, 255, 113, 123,
          164, 13, 101, 221, 20, 165, 59, 151, 73, 0, 164, 127, 235, 172, 31,
          21, 11, 96, 119, 15, 14, 198, 240, 19, 46, 179, 110, 236, 23, 178,
          252, 228, 102, 218, 247, 93, 32, 175, 111, 255, 124, 166, 93, 238,
          197, 100, 73, 137, 249, 161,
        ]
      ),
      communityMint: new PublicKey(
        '6rN6XYMQhYzYeKpsTxh3GGCyeapXsVDzBYAfSYvie2HE'
      ),
      communityMintMaxVoterWeightSource: {
        supplyFraction: new BN(32),
      },
      minCommunityWeightToCreateGovernance: new BN(4),
      name: 'Community side, no plugins',
      communityMintAuthority: new PublicKey(
        'C2H4C25jMVnVC1GVLvTS2ezXZR8a2coeqMcC7rGsSo7U'
      ),
    },
    root: {
      side: 'community',
    },
    maxProposalLifetime: new BN(10230),
    voterWeightResetStep: new BN(3452353),
    nextVoterWeightResetOffset: new BN(237),
  },
];
