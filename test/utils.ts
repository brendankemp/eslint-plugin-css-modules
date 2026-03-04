import path from 'path';
import { RuleTester as EslintRuleTester } from 'eslint';
import { test } from 'mocha';

/* pattern taken from eslint-plugin-import */
export function addFilenameOption (testCase: any) {
  return {
    ...testCase,
    // TODO:  Find a way to remove this.
    filename: path.resolve(__dirname, './files/foo.js'),
  };
}

/**
 * Customizing ESLint rule tester to be run by Mocha.
 * @see https://eslint.org/docs/latest/integrate/nodejs-api#customizing-ruletester
 */
(EslintRuleTester as any).describe = (text: string, method: () => void) => {
  (EslintRuleTester as any).it.title = text;
  return method.call(this);
};

(EslintRuleTester as any).it = (text: string, method: () => void) => {
  test((EslintRuleTester as any).it.title + ': ' + text, method);
};

export function RuleTester () {
  return new EslintRuleTester({
    parserOptions: {
      sourceType: 'module',
      ecmaVersion: 6,
      ecmaFeatures: { jsx: true },
    },
  });
}
