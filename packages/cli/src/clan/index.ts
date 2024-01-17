import {Command} from 'commander';

import {installCreateClanCLI} from './createClan';
import {installSetVotingDelegateCLI} from './setVotingDelegate';
import {installShowClanCLI} from './showClan';

export const installClanCommands = (program: Command) => {
  installCreateClanCLI(program);
  installSetVotingDelegateCLI(program);
  installShowClanCLI(program);
};
