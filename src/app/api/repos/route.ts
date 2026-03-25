import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserRepos } from "@/lib/github";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const accessToken = (session as any).accessToken as string;
  try {
    const repos = await getUserRepos(accessToken);
    return NextResponse.json({ repos });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Failed to fetch repos" },
      { status: 500 }
    );
  }
}
