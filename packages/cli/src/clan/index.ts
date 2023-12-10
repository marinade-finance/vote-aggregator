import {Command} from 'commander';

import {installCreateClanCLI} from './createClan';

export const installClanCommands = (program: Command) => {
  installCreateClanCLI(program);
};
