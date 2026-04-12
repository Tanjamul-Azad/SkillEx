module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist/', 'node_modules/'],
  rules: {
    // Console: warn in dev, error in CI (prefer structured logging)
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-undef': 'off',

    // Unused variables — warn rather than error to avoid blocking builds
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { vars: 'all', args: 'after-used', ignoreRestSiblings: true, argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],

    // Explicit `any` — warn to surface casts without breaking builds
    '@typescript-eslint/no-explicit-any': 'warn',

    // Allow empty catch blocks with a comment
    '@typescript-eslint/no-empty-function': 'off',

    // TypeScript handles this better than ESLint
    '@typescript-eslint/no-require-imports': 'off',

    // Allow non-null assertions where TypeScript strict mode already checks
    '@typescript-eslint/no-non-null-assertion': 'warn',

    // React hooks correctness (already in recommended, made explicit)
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
};
