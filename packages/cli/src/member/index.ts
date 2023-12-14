import {Command} from 'commander';

import {installCreateMemberCLI} from './createMember';
import {installJoinClanCLI} from './joinClain';
import {installStartLeavingClanCLI} from './startLeavingClan';

export const installMemberCommands = (program: Command) => {
  installCreateMemberCLI(program);
  installJoinClanCLI(program);
  installStartLeavingClanCLI(program);
};
