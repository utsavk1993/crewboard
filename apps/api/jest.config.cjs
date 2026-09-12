/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  transform: {
    '^.+\\.ts$': [
      '@swc/jest',
      {
        jsc: { parser: { syntax: 'typescript' } },
        module: { type: 'commonjs' },
      },
    ],
  },
  // The generated Prisma client uses `.js` specifiers for its own `.ts` files.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  globalSetup: '<rootDir>/test/global-setup.ts',
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup-db.ts'],
  // Integration tests share one database, so run test files serially (same as --runInBand).
  maxWorkers: 1,
}
