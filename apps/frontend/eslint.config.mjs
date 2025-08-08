import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "out/**",
      "dist/**",
      "build/**",
      "node_modules/**",
      "coverage/**",
      ".nyc_output/**",
      "*.generated.ts",
      "*.generated.js",
      "test-*.js",
      "tests/fixtures/**"
    ]
  },
  {
    rules: {
      // Core TypeScript rules
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "ignoreRestSiblings": true
      }],
      "@typescript-eslint/no-namespace": "off",
      
      // React rules
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "error",
      
      // Accessibility rules - only apply to actual img elements, not SVG components
      "jsx-a11y/alt-text": ["error", {
        "elements": ["img", "object", "area", "input[type='image']"]
      }]
    }
  },
  {
    // Next.js App Router pages/layouts need to export metadata
    files: [
      "src/app/**/page.tsx",
      "src/app/**/page.ts", 
      "src/app/**/layout.tsx",
      "src/app/**/layout.ts"
    ],
    rules: {
      "react-refresh/only-export-components": "off"
    }
  },
  {
    // API routes can use console for logging
    files: [
      "src/app/api/**/*.ts",
      "src/app/api/**/*.tsx"
    ],
    rules: {
      "no-console": ["warn", { "allow": ["warn", "error", "info"] }]
    }
  }
];

export default eslintConfig;
