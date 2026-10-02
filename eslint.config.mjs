import globals from "globals";
import hooks from "eslint-plugin-react-hooks";
export default [
  { ignores: ["node_modules/**", "dist/**", "coverage/**"] },
  {
    files: ["src/**/*.jsx"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.vitest },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { "react-hooks": hooks },
    rules: { "react-hooks/rules-of-hooks": "error" },
  },
  {
    files: ["server/**/*.cjs", "scripts/**/*.cjs"],
    languageOptions: { globals: globals.node, sourceType: "commonjs" },
    rules: { "no-unreachable": "error", "no-constant-condition": "error" },
  },
];
