import type { Issue } from "./types";
import { generateId } from "./types";

const SECRET_PATTERNS: Array<{
  pattern: RegExp;
  ruleId: string;
  message: string;
  severity: Issue["severity"];
}> = [
  {
    pattern: /(?:password|passwd|pwd)\s*=\s*['"][^'"]{4,}['"]/gi,
    ruleId: "secret/hardcoded-password",
    message: "Hardcoded password detected",
    severity: "critical",
  },
  {
    pattern: /(?:api[_-]?key|apikey)\s*=\s*['"][A-Za-z0-9_\-]{10,}['"]/gi,
    ruleId: "secret/hardcoded-api-key",
    message: "Hardcoded API key detected",
    severity: "critical",
  },
  {
    pattern: /(?:secret|token)\s*=\s*['"][A-Za-z0-9_\-]{10,}['"]/gi,
    ruleId: "secret/hardcoded-secret",
    message: "Hardcoded secret/token detected",
    severity: "critical",
  },
  {
    pattern: /AKIA[0-9A-Z]{16}/g,
    ruleId: "secret/aws-access-key",
    message: "AWS Access Key ID detected",
    severity: "critical",
  },
  {
    pattern: /-----BEGIN (RSA|OPENSSH|DSA|EC) PRIVATE KEY-----/g,
    ruleId: "secret/private-key",
    message: "Private key material detected in code",
    severity: "critical",
  },
  {
    pattern: /eval\s*\(/g,
    ruleId: "security/eval-usage",
    message: "Use of eval() is a security risk (code injection)",
    severity: "high",
  },
  {
    pattern: /innerHTML\s*=/g,
    ruleId: "security/innerHTML-xss",
    message: "Direct innerHTML assignment can lead to XSS vulnerability",
    severity: "high",
  },
  {
    pattern: /document\.write\s*\(/g,
    ruleId: "security/document-write-xss",
    message: "document.write() can lead to XSS if input is not sanitized",
    severity: "high",
  },
  {
    pattern:
      /(?:SELECT|INSERT|UPDATE|DELETE)\s+.+\s+(?:FROM|INTO|SET|WHERE)\s+.+\+\s*(?:req\.|request\.|params\.|query\.)/gi,
    ruleId: "security/sql-injection",
    message:
      "Potential SQL injection — user input directly concatenated in SQL query",
    severity: "critical",
  },
  {
    pattern: /console\.(log|debug|info)\s*\(/g,
    ruleId: "smell/console-log",
    message: "console.log/debug left in production code",
    severity: "low",
  },
  {
    pattern: /TODO|FIXME|HACK|XXX/g,
    ruleId: "smell/todo-comment",
    message: "TODO/FIXME comment found — unfinished work",
    severity: "low",
  },
  {
    pattern: /process\.exit\s*\(/g,
    ruleId: "smell/process-exit",
    message: "process.exit() should not be used in library code",
    severity: "medium",
  },
];

export function runSecretScanner(
  filePath: string,
  code: string
): Issue[] {
  const lines = code.split("\n");
  const issues: Issue[] = [];

  for (const { pattern, ruleId, message, severity } of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (pattern.test(line)) {
        issues.push({
          id: generateId(),
          filePath,
          line: i + 1,
          severity,
          type:
            severity === "critical" || severity === "high"
              ? "security"
              : "smell",
          ruleId,
          message,
          source: line.trim().slice(0, 120),
        });
      }
      pattern.lastIndex = 0;
    }
  }

  return issues;
}
