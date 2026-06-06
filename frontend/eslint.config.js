module.exports = {
  root: true,
  env: {
    browser: true,   // allows browser globals like window, document
    es2020: true,    // allows modern JavaScript syntax
  },
  extends: [
    'eslint:recommended',           // base ESLint rules
    'plugin:react/recommended',     // React-specific rules
    'plugin:react/jsx-runtime',     // allows JSX without importing React
    'plugin:react-hooks/recommended', // rules for hooks (no missing deps)
    'eslint-config-prettier',       // turns off rules that conflict with Prettier
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  settings: {
    react: { version: '18.2' },
  },
  rules: {
    // Warn on unused variables but don't error - useful during development
    'no-unused-vars': 'warn',
    // Error on console.log - use your logger instead in production
    'no-console': 'warn',
  },
}