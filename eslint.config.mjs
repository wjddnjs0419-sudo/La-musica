import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Design-reference export; this nested app is not part of the deployable source tree.
    "AI Music Creation Landing Page/**",
    "workspace_renew/**",
    // Local linked worktrees are separate repositories, never app source.
    ".worktrees/**",
  ]),
]);

export default eslintConfig;
