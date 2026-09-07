import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import pluginPrettier from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-config-prettier";
import boundaries from "eslint-plugin-boundaries";

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
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
  },

  // ── Architecture boundaries (hexagonal, one-way dependency) ──
  // Enforces: app/ → infrastructure/ → application/ → domain/
  // See AGENTS.md for the full architecture description.
  {
    name: "seed-forge/boundaries",
    plugins: {
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        { type: "domain", pattern: "domain/**" },
        { type: "application", pattern: "application/**" },
        { type: "infrastructure", pattern: "infrastructure/**" },
        { type: "app", pattern: "app/**" },
        { type: "components", pattern: "components/**" },
        { type: "resources", pattern: "resources/**" },
        { type: "test", pattern: "test/**" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            // domain: pure TypeScript — may only depend on itself.
            {
              from: { element: { type: "domain" } },
              allow: { to: { element: { type: "domain" } } },
            },
            // application: use-cases + ports — depends only on domain.
            {
              from: { element: { type: "application" } },
              allow: { to: { element: { type: ["domain", "application"] } } },
            },
            // infrastructure: implements the ports — application + domain.
            {
              from: { element: { type: "infrastructure" } },
              allow: {
                to: {
                  element: {
                    type: ["application", "domain", "infrastructure"],
                  },
                },
              },
            },
            // components: shared UI — domain + itself.
            {
              from: { element: { type: "components" } },
              allow: { to: { element: { type: ["domain", "components"] } } },
            },
            // resources: design tokens/icons — only itself (external-only in practice).
            {
              from: { element: { type: "resources" } },
              allow: { to: { element: { type: "resources" } } },
            },
            // app: top layer — may reach everything below.
            {
              from: { element: { type: "app" } },
              allow: { to: { element: { type: "*" } } },
            },
            // test: integration tests — may reach everything.
            {
              from: { element: { type: "test" } },
              allow: { to: { element: { type: "*" } } },
            },
          ],
        },
      ],
    },
  },

  // ── eslint-config-prettier: disables rules that conflict with Prettier ──
  // Must come after all other rule configs.
  ...(Array.isArray(eslintConfigPrettier)
    ? eslintConfigPrettier
    : [eslintConfigPrettier]),

  // ── Global ignores ──
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // AI agent directories
    ".opencode/**",
    ".agent/**",
    ".agents/**",
    ".claude/**",
    ".codex/**",
    ".cursor/**",
    ".gemini/**",
    ".impeccable/**",
    ".kiro/**",
    ".pi/**",
    ".qoder/**",
  ]),
]);

export default eslintConfig;
