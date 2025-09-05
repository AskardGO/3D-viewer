module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'react-hooks'],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^React$',
        ignoreRestSiblings: true,
      },
    ],
    'no-unused-vars': 'off',
    'no-empty-pattern': 'off',
    'no-warning-comments': ['error', { terms: ['todo', 'fixme'], location: 'anywhere' }],
    'no-console': 'off',
  },
};