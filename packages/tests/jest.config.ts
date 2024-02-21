import type {Config} from 'jest';

const config: Config = {
  verbose: true,
  moduleFileExtensions: ['js'],
  setupFilesAfterEnv: ['<rootDir>/build/dev/equalityTesters.js'],
};

export default config;
