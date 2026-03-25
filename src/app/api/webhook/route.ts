import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex")}`;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  const event = req.headers.get("x-github-event") ?? "";

  const webhookSecret = process.env.WEBHOOK_SECRET ?? "";
  if (webhookSecret && !verifySignature(body, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const repo = payload?.repository?.name;
  const owner = payload?.repository?.owner?.login ?? payload?.repository?.owner?.name;
  const prNumber = payload?.pull_request?.number;

  if (!repo || !owner) {
    return NextResponse.json({ status: "ignored", reason: "no repo info" });
  }

  // Fire-and-forget analysis using the personal access token
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const analyzeBody = { owner, repo, ...(prNumber ? { prNumber } : {}) };

  // Call our own analyze endpoint using the server PAT
  fetch(`${baseUrl}/api/analyze-webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-internal": "true",
    },
    body: JSON.stringify(analyzeBody),
  }).catch(() => {});

  return NextResponse.json({
    status: "queued",
    event,
    owner,
    repo,
    prNumber,
  });
}
