// Expo's flat config: the React Native, React Hooks and import rules that match
// this runtime. Plus the two house rules that matter for a repo whose whole
// premise is that tokens and the API client are the only way in.
const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expo,
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'assets/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // A hex in a component is the failure mode `docs/design-system.md` names.
      // Tokens live in src/theme; everything else asks for a class name.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/]',
          message:
            'No hex colours in components. Use a NativeWind token class (bg-surface) or color() from @/theme.',
        },
        {
          selector: 'Literal[value=/\\u20B9/]',
          message:
            'No currency symbols. Format money with formatMoney() from @/lib/money.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message:
                'Only src/lib/supabase.ts may import this, and only for auth. Data goes through src/api. See CLAUDE.md.',
            },
          ],
        },
      ],
    },
  },
  {
    // The two files the rules above exist to protect, and the config that reads
    // the raw values.
    files: ['src/theme/**', 'src/lib/supabase.ts', 'tailwind.config.js'],
    rules: {
      'no-restricted-syntax': 'off',
      'no-restricted-imports': 'off',
    },
  },
]);
