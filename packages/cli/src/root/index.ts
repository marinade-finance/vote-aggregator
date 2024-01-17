import {Command} from 'commander';

import {installCreateRootCLI} from './createRoot';
import {installShowRootCLI} from './showRoot';

export const installRootCommands = (program: Command) => {
  installCreateRootCLI(program);
  installShowRootCLI(program);
};
