import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/.expo/**", "**/.turbo/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }]
    }
  },
  {
    // CommonJS-Node-Konfigdateien (z. B. metro.config.js)
    files: ["**/*.config.{js,cjs}"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { require: "readonly", module: "writable", __dirname: "readonly", process: "readonly" }
    },
    rules: { "@typescript-eslint/no-require-imports": "off" }
  },
  {
    // Node-Skripte (ESM), z. B. Seed fürs Test-Cockpit
    files: ["**/scripts/**/*.{js,mjs}"],
    languageOptions: {
      sourceType: "module",
      globals: { process: "readonly", console: "readonly", fetch: "readonly", setTimeout: "readonly" }
    }
  }
);
