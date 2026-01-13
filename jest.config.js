module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/frontend/'],
  modulePathIgnorePatterns: ['/frontend/'],
};
