import type {Config} from 'jest';

const config: Config = {
  preset: 'ts-jest',
  modulePathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
  setupFilesAfterEnv: ['<rootDir>/dev/equalityTesters.ts'],
};

export default config;
