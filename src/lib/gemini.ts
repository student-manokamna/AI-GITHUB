import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Issue } from "./analyzers";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export interface EnrichedIssue extends Issue {
  explanation: string;
  fix: string;
  bestPractice: string;
  fixedCode?: string;
}

export async function enrichIssue(
  code: string,
  issue: Issue
): Promise<EnrichedIssue> {
  const prompt = `You are an expert code reviewer and security engineer.

A code analysis tool found the following issue in a file called "${issue.filePath}":

Issue Type: ${issue.type}
Severity: ${issue.severity}
Rule/ID: ${issue.ruleId}
Message: ${issue.message}
Line: ${issue.line ?? "unknown"}

Here is the relevant code snippet:
\`\`\`
${code.split("\n").slice(Math.max(0, (issue.line ?? 1) - 5), (issue.line ?? 1) + 5).join("\n")}
\`\`\`

Please respond in valid JSON format with these exact fields:
{
  "explanation": "Simple English explanation of what this issue is and why it's a problem",
  "fix": "Step-by-step guide to fix this issue",
  "bestPractice": "A relevant best practice tip",
  "fixedCode": "The corrected code snippet (just the relevant lines)"
}

Respond ONLY with the JSON object, no markdown, no extra text.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const json = JSON.parse(text.replace(/^```json?\n?/, "").replace(/\n?```$/, ""));
    return {
      ...issue,
      explanation: json.explanation ?? "No explanation available.",
      fix: json.fix ?? "Please review the code manually.",
      bestPractice: json.bestPractice ?? "",
      fixedCode: json.fixedCode ?? "",
    };
  } catch {
    return {
      ...issue,
      explanation: `${issue.message} — This issue was flagged by the static analysis tool.`,
      fix: "Review the code at the indicated line and apply the recommended fix.",
      bestPractice: "Always follow secure coding practices and code style guidelines.",
    };
  }
}
export async function generateFixedFileContent(
  originalCode: string,
  issue: EnrichedIssue
): Promise<string> {
  const prompt = `You are an expert code reviewer and security engineer.

A code analysis tool found the following issue in a file called "${issue.filePath}":

Issue Type: ${issue.type}
Severity: ${issue.severity}
Message: ${issue.message}
Line: ${issue.line ?? "unknown"}
How to fix: ${issue.fix}

Here is the full original code:
\`\`\`
${originalCode}
\`\`\`

Please output the ENTIRE file content with the issue fixed. DO NOT include markdown formatting like \`\`\` or any explanations. ONLY output the raw, fixed code.`;

  try {
    const result = await callWithRetry(() => model.generateContent(prompt));
    let text = result.response.text().trim();
    if (text.startsWith("\`\`\`")) {
      text = text.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
    }
    return text;
  } catch (err: any) {
    console.error("Gemini single fix error:", err);
    throw new Error(err.message || "Failed to generate fixed code");
  }
}

// Helper: read retryDelay from a Gemini 429 error and wait that long
async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempts = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempts++;
      const is429 = error?.status === 429 || error?.message?.includes("429");
      if (!is429 || attempts >= maxRetries) throw error;

      // Extract retryDelay seconds from the error details
      let waitMs = 30000; // default 30s
      const retryMatch = error?.message?.match(/retryDelay":"(\d+)s/);
      if (retryMatch) waitMs = parseInt(retryMatch[1]) * 1000 + 1000;

      console.log(`Gemini rate limited. Waiting ${waitMs / 1000}s before retry ${attempts}/${maxRetries}...`);
      await new Promise((res) => setTimeout(res, waitMs));
    }
  }
}

export async function generateFixedFileContentBulk(
  originalCode: string,
  issues: EnrichedIssue[]
): Promise<string> {
  const issuesList = issues.map((i, idx) => `
Issue ${idx + 1}:
Type: ${i.type}
Severity: ${i.severity}
Message: ${i.message}
Line: ${i.line ?? "unknown"}
Suggested Fix: ${i.fix}
`).join("\n");

  const prompt = `You are an expert code reviewer and security engineer.

A code analysis tool found the following issues in a file:
${issuesList}

Here is the full original code:
\`\`\`
${originalCode}
\`\`\`

Please output the ENTIRE file content with ALL the issues fixed. DO NOT include markdown formatting like \`\`\` or any explanations. ONLY output the raw, fixed code. Return exactly the updated file content.`;

  try {
    const result = await callWithRetry(() => model.generateContent(prompt));
    let text = result.response.text().trim();
    if (text.startsWith("\`\`\`")) {
      text = text.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
    }
    return text;
  } catch (error: any) {
    console.error("Gemini Bulk Fix Error:", error);
    throw new Error(error.message || "Failed to generate bulk fixed code");
  }
}


export async function computeSecurityScore(issues: Issue[]): Promise<number> {
  if (issues.length === 0) return 100;

  const weightMap: Record<string, number> = {
    critical: 25,
    high: 15,
    medium: 7,
    low: 2,
  };

  const totalDeduction = issues.reduce((sum, issue) => {
    return sum + (weightMap[issue.severity] ?? 5);
  }, 0);

  return Math.max(0, Math.min(100, 100 - totalDeduction));
}

export async function generatePRReviewComment(
  enrichedIssues: EnrichedIssue[],
  repoName: string,
  prNumber: number
): Promise<string> {
  const critical = enrichedIssues.filter((i) => i.severity === "critical");
  const high = enrichedIssues.filter((i) => i.severity === "high");
  const medium = enrichedIssues.filter((i) => i.severity === "medium");
  const low = enrichedIssues.filter((i) => i.severity === "low");

  const score = await computeSecurityScore(enrichedIssues);
  const emoji = score >= 80 ? "🟢" : score >= 50 ? "🟡" : "🔴";

  let comment = `## 🤖 AI Code Review — PR #${prNumber} in \`${repoName}\`\n\n`;
  comment += `### Security Score: ${emoji} ${score}/100\n\n`;
  comment += `| Severity | Count |\n|---|---|\n`;
  comment += `| 🔴 Critical | ${critical.length} |\n`;
  comment += `| 🟠 High | ${high.length} |\n`;
  comment += `| 🟡 Medium | ${medium.length} |\n`;
  comment += `| 🟢 Low | ${low.length} |\n\n`;
  comment += `**Total Issues Found:** ${enrichedIssues.length}\n\n---\n\n`;

  const topIssues = enrichedIssues
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
    })
    .slice(0, 10);

  for (const issue of topIssues) {
    const sev =
      issue.severity === "critical"
        ? "🔴 Critical"
        : issue.severity === "high"
        ? "🟠 High"
        : issue.severity === "medium"
        ? "🟡 Medium"
        : "🟢 Low";

    comment += `### ${sev}: ${issue.message}\n`;
    comment += `📁 \`${issue.filePath}\`${issue.line ? ` — Line ${issue.line}` : ""}\n\n`;
    comment += `**What is it?** ${issue.explanation}\n\n`;
    comment += `**How to fix:** ${issue.fix}\n\n`;
    if (issue.fixedCode) {
      comment += `**Fixed Code:**\n\`\`\`\n${issue.fixedCode}\n\`\`\`\n\n`;
    }
    comment += `💡 **Best Practice:** ${issue.bestPractice}\n\n---\n\n`;
  }

  comment += `*Generated by [AI GitHub Code Review Agent](http://localhost:3000)*`;
  return comment;
}
