import parser from "@typescript-eslint/parser";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import importplugin from "eslint-plugin-import-x";
import eslintprettier from "eslint-plugin-prettier";
import tseslintplugin from "@typescript-eslint/eslint-plugin";

const rulesEslint = {
  "no-redeclare": "off",
  "default-param-last": "off",
  "no-duplicate-imports": "off",
  "no-use-before-define": "off",
  "no-unused-expressions": "off",

  radix: "warn",
  "no-nested-ternary": "warn",
  "no-else-return": ["warn", { allowElseIf: false }],

  "no-var": "error",
  "no-sequences": "error",
  "no-console": ["error", { allow: ["error", "warn"] }],
  "prefer-const": ["error", { destructuring: "all" }],

  "@stylistic/key-spacing": ["error", { beforeColon: false, afterColon: true }],
  "@stylistic/max-len": [
    "error",
    { code: 80, ignoreStrings: true, ignoreRegExpLiterals: true, ignoreTemplateLiterals: true },
  ],
  "@stylistic/padding-line-between-statements": [
    "error",
    { blankLine: "always", prev: "*", next: "return" },
    { blankLine: "always", prev: ["const", "let"], next: "*" },
    { blankLine: "any", prev: ["const", "let"], next: ["const", "let"] },
    { blankLine: "always", prev: ["if", "function", "for"], next: ["if", "function", "for"] },
  ],
};

// Sem os pathGroups de react/react-router — não fazem sentido em backend puro.
const rulesImport = {
  "import-x/no-duplicates": "error",
  "import-x/order": [
    "error",
    {
      groups: ["external", "builtin", "type", "internal", "parent", "sibling", "index"],
      "newlines-between": "never",
      alphabetize: { order: "asc", caseInsensitive: true },
    },
  ],
};

const rulesTypescript = {
  "@typescript-eslint/no-namespace": "off",
  "@typescript-eslint/no-inferrable-types": "off",
  "@typescript-eslint/no-confusing-void-expression": "off",
  "@typescript-eslint/explicit-module-boundary-types": "off",

  "@typescript-eslint/no-var-requires": "warn",
  "@typescript-eslint/no-unsafe-argument": "warn",
  "@typescript-eslint/no-non-null-assertion": "warn",
  "@typescript-eslint/no-unused-expressions": "warn",
  "@typescript-eslint/prefer-optional-chain": "warn",
  "@typescript-eslint/restrict-plus-operands": "warn",
  "@typescript-eslint/no-unnecessary-condition": "off",
  "@typescript-eslint/prefer-reduce-type-parameter": "warn",
  "@typescript-eslint/no-unnecessary-type-constraint": "warn",
  "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",

  "@typescript-eslint/no-redeclare": "error",
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/default-param-last": "error",
  "@typescript-eslint/no-use-before-define": "error",
  "@typescript-eslint/consistent-type-imports": "error",
};

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    ignores: ["dist/*", "node_modules/*", "eslint.config.js"],
  },
  {
    files: ["src/**/*.ts", "prisma/**/*.ts"],
    languageOptions: {
      parser: parser,
      parserOptions: {
        projectService: {
          // prisma/*.ts fica fora do tsconfig.json de propósito (não deve
          // afetar o rootDir/build do tsc) — isso libera esses arquivos
          // para usar um "projeto sintético" só para fins de lint.
          allowDefaultProject: ["prisma/*.ts"],
        },
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    settings: {
      "import-x/parsers": { tsParser: [".ts"] },
      "import-x/resolver": { typescript: true },
    },
    plugins: {
      "import-x": importplugin,
      prettier: eslintprettier,
      "@stylistic": stylistic,
      "@typescript-eslint": tseslintplugin,
    },
    rules: {
      "prettier/prettier": "error",
      ...rulesEslint,
      ...rulesImport,
      ...rulesTypescript,
    },
  }
);
