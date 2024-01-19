import {Command} from 'commander';

import {installCreateClanCLI} from './createClan';
import {installSetVotingDelegateCLI} from './setVotingDelegate';
import {installShowClanCLI} from './showClan';
import {installConfigureClanCLI} from './configureClan';

export const installClanCommands = (program: Command) => {
  installCreateClanCLI(program);
  installConfigureClanCLI(program);
  installSetVotingDelegateCLI(program);
  installShowClanCLI(program);
};
