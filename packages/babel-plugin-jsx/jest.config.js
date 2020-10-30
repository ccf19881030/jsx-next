module.exports = {
  setupFiles: ['./test/setup.ts'],
  moduleNameMapper: {
    '@vue/babel-plugin-jsx': '<rootDir>/dist',
  },
  transform: {
    '\\.(ts|tsx)$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      babelConfig: true,
    },
  },
};
