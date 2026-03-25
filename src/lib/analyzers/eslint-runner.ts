import { ESLint } from "eslint";
import * as tsParser from "@typescript-eslint/parser";
import type { Issue } from "./types";
import { generateId } from "./types";

const JS_TS_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"];

function mapESLintSeverity(severity: 0 | 1 | 2): Issue["severity"] {
  if (severity === 2) return "high";
  if (severity === 1) return "medium";
  return "low";
}

function mapRuleToType(ruleId: string | null): Issue["type"] {
  if (!ruleId) return "style";
  if (
    ruleId.includes("security") ||
    ruleId.includes("no-eval") ||
    ruleId.includes("no-new-func")
  )
    return "security";
  if (
    ruleId.includes("no-unused") ||
    ruleId.includes("no-undef") ||
    ruleId.includes("no-const-assign")
  )
    return "bug";
  return "smell";
}

export async function runESLint(
  filePath: string,
  code: string
): Promise<Issue[]> {
  const ext = "." + filePath.split(".").pop()!.toLowerCase();
  if (!JS_TS_EXTENSIONS.includes(ext)) return [];

  try {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [
        {
          files: ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],
          languageOptions: {
            parser: tsParser,
            ecmaVersion: 2022,
            sourceType: "module",
            parserOptions: {
              ecmaFeatures: { jsx: true },
            },
          },
          rules: {
            "no-unused-vars": "warn",
            "no-eval": "error",
            "no-new-func": "error",
            "no-implied-eval": "error",
            "no-undef": "warn",
            "no-const-assign": "error",
            eqeqeq: "warn",
            "no-console": "warn",
            "no-debugger": "error",
            "no-alert": "warn",
            "no-empty": "warn",
            "no-unreachable": "error",
            "no-duplicate-case": "error",
            "no-fallthrough": "error",
            "no-redeclare": "error",
            "prefer-const": "warn",
            "no-var": "warn",
            "no-with": "error",
            "no-proto": "error",
          },
        },
      ],
    });

    const results = await eslint.lintText(code, { filePath });
    const issues: Issue[] = [];

    for (const result of results) {
      for (const msg of result.messages) {
        issues.push({
          id: generateId(),
          filePath,
          line: msg.line,
          column: msg.column,
          severity: mapESLintSeverity(msg.severity as 0 | 1 | 2),
          type: mapRuleToType(msg.ruleId ?? null),
          ruleId: msg.ruleId ?? "unknown",
          message: msg.message,
        });
      }
    }

    return issues;
  } catch {
    return [];
  }
}
