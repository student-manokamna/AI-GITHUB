import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFileContent, createFixPR } from "@/lib/github";
import { generateFixedFileContent } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accessToken = (session as any).accessToken as string;

  const body = await req.json();
  const { owner, repo, issue } = body;

  if (!owner || !repo || !issue || !issue.filePath) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  try {
    // 1. Get original file content
    const originalContent = await getFileContent(owner, repo, issue.filePath, accessToken);
    if (!originalContent) {
      return NextResponse.json({ error: "Could not fetch original file from GitHub" }, { status: 404 });
    }

    // 2. Generate full fixed content using Gemini
    const newContent = await generateFixedFileContent(originalContent, issue);

    // 3. Create branch, commit, and PR
    const prUrl = await createFixPR(
      owner,
      repo,
      issue.filePath,
      newContent,
      issue.message,
      issue.id,
      accessToken
    );

    return NextResponse.json({ prUrl });
  } catch (error: any) {
    console.error("Auto-fix error:", error);
    return NextResponse.json(
      { error: error.message ?? "Failed to create auto-fix PR" },
      { status: 500 }
    );
  }
}
