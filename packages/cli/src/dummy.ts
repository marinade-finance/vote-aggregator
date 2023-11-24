import {Command} from 'commander';
import {context} from './context';
import {execute} from './execute';

export const installDummyCLI = (program: Command) => {
  program.command('dummy').action(dummy);
};

const dummy = async () => {
  const {sdk} = context!;
  await execute({
    instructions: [await sdk.dummyInstruction()],
  });
};
