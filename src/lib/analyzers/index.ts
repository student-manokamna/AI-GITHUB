export { type Issue, type Severity, type IssueType, generateId } from "./types";
import { runESLint } from "./eslint-runner";
import { runBandit } from "./bandit-runner";
import { runSecretScanner } from "./secret-scanner";
import type { Issue } from "./types";

export interface FileAnalysis {
  filePath: string;
  issues: Issue[];
}

export async function analyzeFile(
  filePath: string,
  code: string
): Promise<Issue[]> {
  const [eslintIssues, banditIssues, secretIssues] = await Promise.all([
    runESLint(filePath, code),
    runBandit(filePath, code),
    Promise.resolve(runSecretScanner(filePath, code)),
  ]);

  // Deduplicate by line + ruleId
  const seen = new Set<string>();
  const all = [...eslintIssues, ...banditIssues, ...secretIssues];
  return all.filter((issue) => {
    const key = `${issue.filePath}:${issue.line ?? 0}:${issue.ruleId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function analyzeFiles(
  files: Array<{ path: string; content: string }>
): Promise<Issue[]> {
  const allIssues: Issue[] = [];
  for (const file of files) {
    const issues = await analyzeFile(file.path, file.content);
    allIssues.push(...issues);
  }
  return allIssues;
}
