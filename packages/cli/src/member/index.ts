import {Command} from 'commander';

import {installCreateMemberCLI} from './createMember';

export const installMemberCommands = (program: Command) => {
  installCreateMemberCLI(program);
};
