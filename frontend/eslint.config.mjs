// ESLint cho cả hai app: JS chạy thẳng (thiet-ke, shared, tests) và app mua TypeScript (mua-ts).
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
  { ignores: ["dist/**", "node_modules/**", "assets/vendor/**", "assets/qr.js", "tham-khao/**", "trau-rive/**", "**/*.min.js"] },
  js.configs.recommended,
  ...tseslint.configs.recommended.map((c) => ({ ...c, files: ["mua-ts/**/*.ts"] })),
  { files: ["**/*.js", "**/*.mjs"], languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: { ...globals.browser, ...globals.node } } },
  { rules: { "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }], "no-empty": ["error", { allowEmptyCatch: true }] } },
  { files: ["mua-ts/**/*.ts"], rules: { "@typescript-eslint/no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }], "@typescript-eslint/no-explicit-any": "warn" } },
];
