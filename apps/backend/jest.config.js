const path = require('path');

/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  modulePaths: ['<rootDir>/src'],
  testRegex: '.*\\.spec\\.ts$',
  // NOTE: e2e specs (*.e2e-spec.ts) run via the separate test/jest-e2e.json
  // config (npm run test:e2e) because they require a live database.
  transform: {
    // Absolute path so ts-jest always uses the right compiler settings
    // regardless of cwd. (ts-jest does not expand '<rootDir>' in this option,
    // and its cwd-based auto-detection is unreliable under npm workspaces.)
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: path.join(__dirname, 'tsconfig.spec.json') }],
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text-summary', 'lcov', 'json'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@crm-erp/backend/(.*)$': '<rootDir>/src/$1',
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};
