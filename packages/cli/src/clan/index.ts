import {Command} from 'commander';

import {installCreateClanCLI} from './createClan';
import {installSetVotingDelegateCLI} from './setVotingDelegate';

export const installClanCommands = (program: Command) => {
  installCreateClanCLI(program);
  installSetVotingDelegateCLI(program);
};
