import {Keypair, PublicKey} from '@solana/web3.js';
import {buildKeypair} from '../..';
import {RealmTestData} from '../../realm';
import {BN} from '@coral-xyz/anchor';
import {RootTestData} from '../../root';

export type CreateClanTestData = {
  root: RootTestData;
  clan: {
    address: Keypair;
    owner: PublicKey;
  };
};

export const successfulCreateClanTestData: CreateClanTestData[] = [
  {
    root: new RootTestData({
      realm: new RealmTestData({
        splGovernanceId: new PublicKey(
          'AVqrBPNur5vto9EJaETnD6HSqjpxfGQ8zPTrz9EY7T4q'
        ),
        id: new PublicKey('8CyksxgQZZfHGdo4rKNEnxewQjfc8o2Vp6nkeBaJSMyB'),
        communityMint: new PublicKey(
          'HvNCWxs9Dw8rUFYbZyu6fyBGKnrdVGHK3FAEnHrWTJLh'
        ),
        communityMintMaxVoterWeightSource: {
          supplyFraction: new BN(11),
        },
        minCommunityWeightToCreateGovernance: new BN(6),
        name: 'Community side, no plugins',
        communityMintAuthority: new PublicKey(
          '9o2TRPV9K4677o1x2DGWphTY3fXLvdASQ1uXrmyWGMWp'
        ),
      }),
      side: 'community',
    }),
    clan: {
      address: buildKeypair(
        'aJ5V8qydHkhhGs5PnaStqi2mib4PH6uFLzntRS9AsyC',
        [
          72, 253, 235, 150, 207, 26, 69, 35, 217, 149, 206, 248, 79, 215, 91,
          88, 200, 247, 48, 177, 10, 239, 59, 253, 200, 220, 205, 42, 197, 175,
          117, 181, 8, 135, 121, 225, 127, 233, 14, 196, 203, 93, 55, 233, 36,
          94, 253, 173, 25, 168, 225, 210, 53, 11, 90, 245, 35, 111, 114, 132,
          58, 36, 206, 203,
        ]
      ),
      owner: new PublicKey('miF5DdXCzR7L8hh6LMYCUVcMTE2BfV3qpSESvbUMYkg'),
    },
  },
];
