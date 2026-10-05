const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const projectRules = require('./tooling/ui-rules.cjs');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/**', '.expo/**', 'node_modules/**'] },
  {
    files: ['tests/**/*.cjs', 'tooling/**/*.cjs'],
    languageOptions: { globals: { __dirname: 'readonly', Buffer: 'readonly' } },
  },
  {
    files: ['App.js', 'src/**/*.js'],
    plugins: { project: projectRules },
    rules: { 'project/stable-control-layout': 'error' },
  },
  {
    files: ['App.js', 'src/app/**/*.js', 'src/screens/**/*.js', 'src/features/**/*.js', 'src/navigation/**/*.js'],
    rules: { 'project/design-tokens': 'error' },
  },
]);
