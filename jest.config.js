module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/routes/**/*.test.js', '**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 30000
};