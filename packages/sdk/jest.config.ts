import type {Config} from 'jest';

const config: Config = {
  verbose: true,
  moduleFileExtensions: ['js'],
  snapshotResolver: './snapshotResolver.js',
};

export default config;
