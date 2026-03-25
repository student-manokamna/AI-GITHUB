import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRepoPulls, getRepoCommits, getRepoFileTree } from "@/lib/github";
import { getRepoResults } from "@/lib/store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accessToken = (session as any).accessToken as string;
  const { owner, repo } = await params;

  const [pulls, commits, files, storedResults] = await Promise.all([
    getRepoPulls(owner, repo, accessToken).catch(() => []),
    getRepoCommits(owner, repo, accessToken).catch(() => []),
    getRepoFileTree(owner, repo, accessToken).catch(() => []),
    Promise.resolve(getRepoResults(owner, repo)),
  ]);

  return NextResponse.json({ pulls, commits, files, analysisHistory: storedResults });
}
