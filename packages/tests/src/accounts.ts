import {AnchorProvider, IdlAccounts, IdlTypes} from '@coral-xyz/anchor';

import {VoteAggregator} from './vote_aggregator';

export type RootAccount = IdlAccounts<VoteAggregator>['root'];
