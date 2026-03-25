import fs from "fs";
import path from "path";
import type { EnrichedIssue } from "./gemini";

export interface AnalysisResult {
  owner: string;
  repo: string;
  prNumber?: number;
  branch?: string;
  analyzedAt: string;
  securityScore: number;
  totalIssues: number;
  issues: EnrichedIssue[];
  filesAnalyzed: number;
}

// In-memory cache
const memoryStore = new Map<string, AnalysisResult>();

const STORE_FILE = path.join("/tmp", "ai-github-store.json");

function loadFromDisk(): void {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf-8");
      const data: Record<string, AnalysisResult> = JSON.parse(raw);
      for (const [key, value] of Object.entries(data)) {
        memoryStore.set(key, value);
      }
    }
  } catch {}
}

function saveToDisk(): void {
  try {
    const data: Record<string, AnalysisResult> = {};
    memoryStore.forEach((value, key) => {
      data[key] = value;
    });
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch {}
}

// Load on module init
loadFromDisk();

export function storeResult(result: AnalysisResult): void {
  const key = `${result.owner}/${result.repo}${result.prNumber ? `#${result.prNumber}` : ""}`;
  memoryStore.set(key, result);
  saveToDisk();
}

export function getResult(
  owner: string,
  repo: string,
  prNumber?: number
): AnalysisResult | undefined {
  const key = `${owner}/${repo}${prNumber ? `#${prNumber}` : ""}`;
  return memoryStore.get(key);
}

export function getAllResults(): AnalysisResult[] {
  return Array.from(memoryStore.values());
}

export function getRepoResults(owner: string, repo: string): AnalysisResult[] {
  const results: AnalysisResult[] = [];
  memoryStore.forEach((value, key) => {
    if (key.startsWith(`${owner}/${repo}`)) {
      results.push(value);
    }
  });
  return results.sort(
    (a, b) =>
      new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
  );
}
