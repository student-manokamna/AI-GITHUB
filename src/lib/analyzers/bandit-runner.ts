import { exec } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import type { Issue } from "./types";
import { generateId } from "./types";

const execAsync = promisify(exec);

interface BanditResult {
  results: Array<{
    filename: string;
    test_id: string;
    test_name: string;
    issue_severity: string;
    issue_confidence: string;
    issue_text: string;
    line_number: number;
    code: string;
  }>;
}

function mapBanditSeverity(sev: string): Issue["severity"] {
  if (sev === "HIGH") return "high";
  if (sev === "MEDIUM") return "medium";
  return "low";
}

export async function runBandit(
  filePath: string,
  code: string
): Promise<Issue[]> {
  if (!filePath.endsWith(".py")) return [];

  // Check if bandit is available
  try {
    await execAsync("which bandit");
  } catch {
    // Bandit not installed — do manual Python pattern check instead
    return runPythonPatternCheck(filePath, code);
  }

  const tmpFile = join(tmpdir(), `bandit_${Date.now()}.py`);
  try {
    writeFileSync(tmpFile, code, "utf-8");
    const { stdout } = await execAsync(
      `bandit -f json -q "${tmpFile}" 2>/dev/null`
    );
    const result: BanditResult = JSON.parse(stdout);
    return result.results.map((r) => ({
      id: generateId(),
      filePath,
      line: r.line_number,
      severity: mapBanditSeverity(r.issue_severity),
      type: "security" as const,
      ruleId: r.test_id,
      message: r.issue_text,
      source: r.code?.trim().slice(0, 120),
    }));
  } catch {
    return [];
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {}
  }
}

// Fallback for when Bandit is not installed
function runPythonPatternCheck(filePath: string, code: string): Issue[] {
  const lines = code.split("\n");
  const issues: Issue[] = [];

  const patterns: Array<{
    pattern: RegExp;
    ruleId: string;
    message: string;
    severity: Issue["severity"];
  }> = [
    {
      pattern: /exec\s*\(|eval\s*\(/g,
      ruleId: "B102",
      message: "Use of exec() or eval() is a security risk",
      severity: "high",
    },
    {
      pattern: /subprocess\.call\s*\(.+shell\s*=\s*True/g,
      ruleId: "B602",
      message: "subprocess call with shell=True is a security risk",
      severity: "high",
    },
    {
      pattern: /pickle\.loads?\s*\(/g,
      ruleId: "B301",
      message: "Pickle deserialisation may allow arbitrary code execution",
      severity: "high",
    },
    {
      pattern: /md5\s*\(|sha1\s*\(/g,
      ruleId: "B303",
      message: "Use of MD5/SHA1 is insecure for cryptographic purposes",
      severity: "medium",
    },
    {
      pattern: /password\s*=\s*['"]/gi,
      ruleId: "B105",
      message: "Hardcoded password string",
      severity: "critical",
    },
    {
      pattern: /input\s*\(/g,
      ruleId: "B322",
      message: "input() in Python 2 is equivalent to eval() — check Python version",
      severity: "medium",
    },
  ];

  for (const { pattern, ruleId, message, severity } of patterns) {
    pattern.lastIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        issues.push({
          id: generateId(),
          filePath,
          line: i + 1,
          severity,
          type: "security",
          ruleId,
          message,
          source: lines[i].trim().slice(0, 120),
        });
      }
      pattern.lastIndex = 0;
    }
  }

  return issues;
}
