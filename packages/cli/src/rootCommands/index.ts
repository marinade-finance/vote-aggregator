import {Command} from 'commander';

import {installCreateRootCLI} from './createRoot';

export const installRootCommands = (program: Command) => {
  installCreateRootCLI(program);
};
