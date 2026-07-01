const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const baseConfig = createJestConfig({
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testMatch: ['**/__tests__/**/*.test.ts'],
});

module.exports = async () => {
  const config = await baseConfig();
  // jose is ESM-only; tell Jest to transform it instead of treating it as CJS
  config.transformIgnorePatterns = ['/node_modules/(?!(jose)/)'];
  return config;
};
