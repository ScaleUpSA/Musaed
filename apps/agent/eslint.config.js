import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["dist/**"],
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      "no-unused-vars": ["error", { args: "none" }],
    },
  },
];
