export type Severity = "critical" | "high" | "medium" | "low";
export type IssueType = "bug" | "security" | "smell" | "style";

export interface Issue {
  id: string;
  filePath: string;
  line?: number;
  column?: number;
  severity: Severity;
  type: IssueType;
  ruleId: string;
  message: string;
  source?: string;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}
