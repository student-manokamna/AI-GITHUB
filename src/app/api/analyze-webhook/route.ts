// Internal endpoint called by the webhook handler (uses the server PAT, no session needed)
import { NextRequest, NextResponse } from "next/server";
import { getDefaultBranchFiles, getPRFiles, getFileContent, postPRReviewComment } from "@/lib/github";
import { analyzeFiles } from "@/lib/analyzers";
import { enrichIssue, computeSecurityScore, generatePRReviewComment } from "@/lib/gemini";
import { storeResult } from "@/lib/store";
import type { Issue } from "@/lib/analyzers/types";

export async function POST(req: NextRequest) {
  const isInternal = req.headers.get("x-webhook-internal") === "true";
  if (!isInternal) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { owner, repo, prNumber } = await req.json();
  const accessToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN!;

  try {
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

    if (files.length === 0) return NextResponse.json({ status: "no files" });

    const rawIssues: Issue[] = await analyzeFiles(files);
    const fileMap = new Map(files.map((f) => [f.path, f.content]));
    const enriched = await Promise.all(
      rawIssues.slice(0, 15).map((issue) =>
        enrichIssue(fileMap.get(issue.filePath) ?? "", issue)
      )
    );
    const remaining = rawIssues.slice(15).map((i) => ({
      ...i, explanation: i.message, fix: "Review manually.", bestPractice: "",
    }));
    const allEnriched = [...enriched, ...remaining];
    const securityScore = await computeSecurityScore(rawIssues);

    storeResult({
      owner, repo, prNumber,
      branch: prNumber ? undefined : "default",
      analyzedAt: new Date().toISOString(),
      securityScore,
      totalIssues: rawIssues.length,
      issues: allEnriched,
      filesAnalyzed: files.length,
    });

    if (prNumber) {
      const comment = await generatePRReviewComment(allEnriched, repo, prNumber);
      await postPRReviewComment(owner, repo, prNumber, comment, accessToken).catch(() => {});
    }

    return NextResponse.json({ status: "done", owner, repo, totalIssues: rawIssues.length, securityScore });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
