import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFileContent, createBulkFixPR, FileUpdate } from "@/lib/github";
import { generateFixedFileContent } from "@/lib/gemini";
import type { EnrichedIssue } from "@/components/IssueCard";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accessToken = (session as any).accessToken as string;

  const body = await req.json();
  const { owner, repo, issues } = body as { owner: string; repo: string; issues: EnrichedIssue[] };

  if (!owner || !repo || !issues || issues.length === 0) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  try {
    // Process top 5 issues (one by one, each as individual AI call)
    const topIssues = issues.slice(0, 5);

    // Track latest content per file so each fix is applied on top of the previous one
    const fileContentCache: Record<string, string> = {};
    const filesToUpdate: FileUpdate[] = [];
    const fixedFilePaths = new Set<string>();

    for (let i = 0; i < topIssues.length; i++) {
      const issue = topIssues[i] as unknown as import("@/lib/gemini").EnrichedIssue;
      const filePath = issue.filePath;

      // Fetch the file only once, then reuse cached version for subsequent fixes to the same file
      if (!fileContentCache[filePath]) {
        const content = await getFileContent(owner, repo, filePath, accessToken);
        if (!content) continue;
        fileContentCache[filePath] = content;
      }

      try {
        const fixedContent = await generateFixedFileContent(fileContentCache[filePath], issue);
        if (fixedContent && fixedContent !== fileContentCache[filePath]) {
          // Update the cache so next fix on same file uses the already-fixed version
          fileContentCache[filePath] = fixedContent;
          fixedFilePaths.add(filePath);
        }
      } catch (err) {
        console.error(`Skipping issue in ${filePath}:`, err);
      }

      // 15s delay between each AI call to stay within free tier rate limits
      if (i < topIssues.length - 1) {
        await sleep(15000);
      }
    }

    // Build the final list of files to push
    for (const filePath of fixedFilePaths) {
      filesToUpdate.push({ filePath, newContent: fileContentCache[filePath] });
    }

    if (filesToUpdate.length === 0) {
      return NextResponse.json({
        error: "Could not fix any issues. The Gemini free-tier quota may be exhausted. Please try again in a few minutes.",
      }, { status: 500 });
    }

    const prUrl = await createBulkFixPR(owner, repo, filesToUpdate, accessToken);
    return NextResponse.json({ prUrl, filesFixed: filesToUpdate.length, issuesAttempted: topIssues.length });
  } catch (error: any) {
    console.error("Auto-fix all error:", error);
    return NextResponse.json(
      { error: error.message ?? "Failed to create bulk fix PR" },
      { status: 500 }
    );
  }
}
