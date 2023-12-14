import {Command} from 'commander';

import {installCreateMemberCLI} from './createMember';
import {installJoinClanCLI} from './joinClain';

export const installMemberCommands = (program: Command) => {
  installCreateMemberCLI(program);
  installJoinClanCLI(program);
};
