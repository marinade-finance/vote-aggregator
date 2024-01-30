import {IdlAccounts} from '@coral-xyz/anchor';

import {VoteAggregator} from './vote_aggregator';

export type RootAccount = IdlAccounts<VoteAggregator>['root'];
export type ClanAccount = IdlAccounts<VoteAggregator>['clan'];
export type MemberAccount = IdlAccounts<VoteAggregator>['member'];
export type VoterWeightAccount =
  IdlAccounts<VoteAggregator>['voterWeightRecord'];
export type MaxVoterWeightAccount =
  IdlAccounts<VoteAggregator>['maxVoterWeightRecord'];
