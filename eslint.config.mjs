import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import pluginPrettier from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  // ── Next.js presets (include react, react-hooks, jsx-a11y, import, @next/next plugins) ──
  ...nextVitals,
  ...nextTs,

  // ── Additional rules and settings ──
  {
    name: "seed-forge/custom-rules",
    plugins: {
      prettier: pluginPrettier,
    },
    rules: {
      // Prettier
      "prettier/prettier": "warn",

      // Import
      "import/no-extraneous-dependencies": ["error", { devDependencies: true }],

      // React
      "react/jsx-filename-extension": [
        "warn",
        { extensions: [".js", ".ts", ".jsx", ".tsx"] },
      ],
      "react/function-component-definition": [
        "error",
        { namedComponents: "arrow-function" },
      ],
      "react/jsx-props-no-spreading": "off",

      // Code style
      "object-curly-newline": "off",
      "object-curly-spacing": ["error", "always"],
      "no-new-object": "error",
      "no-sparse-arrays": "error",
      "array-bracket-spacing": "error",
      "no-array-constructor": "error",
      "no-nested-ternary": "off",

      // TypeScript
      "@typescript-eslint/explicit-function-return-type": "off",

      // Accessibility
      "jsx-a11y/anchor-is-valid": [
        "error",
        {
          components: ["Link"],
          specialLink: ["hrefLeft", "hrefRight"],
          aspects: ["invalidHref", "preferButton"],
        },
      ],
    },
    settings: {
      "import/resolver": {
        node: {
          paths: ["src"],
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
      },
    },
  },

  // ── eslint-config-prettier: disables rules that conflict with Prettier ──
  // Must come after all other rule configs.
  ...(Array.isArray(eslintConfigPrettier)
    ? eslintConfigPrettier
    : [eslintConfigPrettier]),

  // ── Global ignores ──
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
