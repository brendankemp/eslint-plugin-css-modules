import rules from './rules';

const name = 'eslint-plugin-css-modules';
const version = '3.0.0';

const ruleLevels = {
  'css-modules/no-unused-class': 'error',
  'css-modules/no-undef-class': 'error',
} as const;

export const configs = {
  recommended: {
    rules: ruleLevels,
  },
  'flat/recommended': {
    plugins: {
      'css-modules': { rules },
    },
    rules: ruleLevels,
  },
};

const plugin = {
  meta: {
    name,
    version,
    namespace: 'css-modules',
  },
  rules,
  configs,
};

export default plugin;
