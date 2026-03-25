import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getDefaultBranchFiles,
  getPRFiles,
  getFileContent,
  postPRReviewComment,
} from "@/lib/github";
import { analyzeFiles } from "@/lib/analyzers";
import { enrichIssue, computeSecurityScore, generatePRReviewComment } from "@/lib/gemini";
import { storeResult } from "@/lib/store";
import type { Issue } from "@/lib/analyzers/types";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accessToken = (session as any).accessToken as string;

  const body = await req.json();
  const { owner, repo, prNumber } = body as {
    owner: string;
    repo: string;
    prNumber?: number;
  };

  if (!owner || !repo) {
    return NextResponse.json({ error: "owner and repo are required" }, { status: 400 });
  }

  try {
    // 1. Fetch files to analyze
    let files: Array<{ path: string; content: string }> = [];

    if (prNumber) {
      const prFiles = await getPRFiles(owner, repo, prNumber, accessToken);
      for (const f of prFiles.slice(0, 20)) {
        if (!f.filename) continue;
        const content = await getFileContent(owner, repo, f.filename, accessToken);
        if (content) files.push({ path: f.filename, content });
      }
    } else {
      files = await getDefaultBranchFiles(owner, repo, accessToken);
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No analyzable files found in repository" }, { status: 400 });
    }

    // 2. Static analysis
    const rawIssues: Issue[] = await analyzeFiles(files);

    // 3. AI enrichment (parallel, max 15 issues to avoid rate limits)
    const issuesToEnrich = rawIssues.slice(0, 15);
    const fileMap = new Map(files.map((f) => [f.path, f.content]));

    const enrichedIssues = await Promise.all(
      issuesToEnrich.map((issue) => {
        const code = fileMap.get(issue.filePath) ?? "";
        return enrichIssue(code, issue);
      })
    );

    // Add remaining un-enriched issues
    const remainingIssues = rawIssues.slice(15).map((issue) => ({
      ...issue,
      explanation: issue.message,
      fix: "Review this issue manually.",
      bestPractice: "Follow secure coding practices.",
    }));

    const allEnriched = [...enrichedIssues, ...remainingIssues];

    // 4. Security score
    const securityScore = await computeSecurityScore(rawIssues);

    // 5. Store result
    const result = {
      owner,
      repo,
      prNumber,
      branch: prNumber ? undefined : "default",
      analyzedAt: new Date().toISOString(),
      securityScore,
      totalIssues: rawIssues.length,
      issues: allEnriched,
      filesAnalyzed: files.length,
    };
    storeResult(result);

    // 6. Post PR review comment if prNumber given
    if (prNumber) {
      try {
        const comment = await generatePRReviewComment(allEnriched, repo, prNumber);
        await postPRReviewComment(owner, repo, prNumber, comment, accessToken);
      } catch {}
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: error.message ?? "Analysis failed" },
      { status: 500 }
    );
  }
}
