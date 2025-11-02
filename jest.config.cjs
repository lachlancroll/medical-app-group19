// jest.config.cjs
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^expo-linear-gradient$': '<rootDir>/__mocks__/expo-linear-gradient.js',
  },
};
