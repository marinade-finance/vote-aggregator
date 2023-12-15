import {Command} from 'commander';

import {installCreateMemberCLI} from './createMember';
import {installJoinClanCLI} from './joinClain';
import {installStartLeavingClanCLI} from './startLeavingClan';
import {installLeaveClanCLI} from './leaveClan';

export const installMemberCommands = (program: Command) => {
  installCreateMemberCLI(program);
  installJoinClanCLI(program);
  installStartLeavingClanCLI(program);
  installLeaveClanCLI(program);
};
