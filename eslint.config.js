// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // New in eslint-config-expo 57 (React Compiler rule set). Our effects do
      // async Appwrite reads and reset form state when a modal opens, which is
      // the intended pattern here. Revisit if we move reads behind Suspense.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
