"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import SecurityScore from "@/components/SecurityScore";
import IssueCard, { type EnrichedIssue } from "@/components/IssueCard";

interface AnalysisResult {
  owner: string;
  repo: string;
  prNumber?: number;
  analyzedAt: string;
  securityScore: number;
  totalIssues: number;
  issues: EnrichedIssue[];
  filesAnalyzed: number;
}

interface PR { number: number; title: string; state: string; html_url: string; user: { login: string } }

type SeverityFilter = "all" | "critical" | "high" | "medium" | "low";

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export default function RepoDetailPage({ params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { data: session } = useSession();
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [pulls, setPulls] = useState<PR[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filter, setFilter] = useState<SeverityFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [fixingAll, setFixingAll] = useState(false);
  const [fixAllUrl, setFixAllUrl] = useState<string | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    params.then(({ owner: o, repo: r }) => {
      setOwner(o);
      setRepo(r);
      fetch(`/api/repos/${o}/${r}`)
        .then((res) => res.json())
        .then((data) => {
          setPulls(data.pulls ?? []);
          if (data.analysisHistory && data.analysisHistory.length > 0) {
            setResult(data.analysisHistory[0]);
          }
          setInitialLoading(false);
        })
        .catch(() => setInitialLoading(false));
    });
  }, [params]);

  const handleAnalyze = useCallback(async (prNumber?: number) => {
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo, ...(prNumber ? { prNumber } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult(data);
      showToast(`✅ ${data.totalIssues} issues found. Score: ${data.securityScore}/100`);
    } catch (err: any) {
      showToast(err.message ?? "Analysis failed", "error");
    } finally {
      setLoading(false);
    }
  }, [owner, repo]);

  const handleFixAll = async () => {
    if (!result || !result.issues || result.issues.length === 0) return;
    setFixingAll(true);
    setFixAllUrl(null);
    try {
      const res = await fetch("/api/fix-all-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo, issues: result.issues }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create PR");
      setFixAllUrl(data.prUrl);
      showToast(`✅ Bulk Fix PR created successfully!`);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setFixingAll(false);
    }
  };

  const filteredIssues = (result?.issues ?? [])
    .filter((i) => filter === "all" || i.severity === filter)
    .filter((i) => typeFilter === "all" || i.type === typeFilter)
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4));

  const counts = (result?.issues ?? []).reduce<Record<string, number>>((acc, i) => {
    acc[i.severity] = (acc[i.severity] ?? 0) + 1;
    return acc;
  }, {});

  if (initialLoading) {
    return (
      <div className="gradient-bg min-h-screen" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
      </div>
    );
  }

  return (
    <div className="gradient-bg min-h-screen">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-logo">
          <div className="navbar-logo-icon">🤖</div>
          AI Code Review
        </div>
        <div className="navbar-actions">
          <Link href="/dashboard" className="btn btn-ghost" style={{ fontSize: 13, padding: "7px 14px" }}>← Dashboard</Link>
          {(session?.user as any)?.image && (
            <img src={(session?.user as any).image} alt="avatar" className="avatar" />
          )}
        </div>
      </nav>

      <div className="page-wrap">
        {/* Header */}
        <div className="flex items-center justify-between mb-6" style={{ flexWrap: "wrap", gap: 16 }}>
          <div>
            <div className="text-muted text-sm mb-2">{owner} /</div>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>{repo}</h1>
            {result && (
              <p className="text-muted text-sm mt-2">
                Last analyzed: {new Date(result.analyzedAt).toLocaleString()} • {result.filesAnalyzed} files scanned
              </p>
            )}
          </div>
          <div className="flex gap-3 items-center">
            {result && <SecurityScore score={result.securityScore} size={90} />}
            <button
              className="btn btn-primary"
              onClick={() => handleAnalyze()}
              disabled={loading}
              style={{ padding: "11px 22px" }}
            >
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Analyzing…</> : "🔍 Analyze Branch"}
            </button>
            {result && result.issues.length > 0 && (
              <button
                className="btn btn-primary"
                onClick={handleFixAll}
                disabled={fixingAll}
                style={{ padding: "11px 22px", background: "var(--low)", color: "#000" }}
              >
                {fixingAll ? <><span className="spinner" style={{ width: 14, height: 14, borderColor: "#000", borderBottomColor: "transparent" }} /> Fixing…</> : "🚀 Auto-Fix All Issues"}
              </button>
            )}
            {fixAllUrl && (
              <a href={fixAllUrl} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: "11px 22px", background: "var(--bg-glass)" }}>
                ✅ View PR ↗
              </a>
            )}
          </div>
        </div>

        {/* Stats */}
        {result && (
          <div className="grid-4 mb-6">
            {[
              { label: "Total Issues", value: result.totalIssues, color: "var(--text-primary)" },
              { label: "Critical", value: counts.critical ?? 0, color: "var(--critical)" },
              { label: "High", value: counts.high ?? 0, color: "var(--high)" },
              { label: "Security Score", value: `${result.securityScore}/100`, color: result.securityScore >= 80 ? "var(--low)" : result.securityScore >= 50 ? "var(--medium)" : "var(--critical)" },
            ].map((s) => (
              <div className="stat-card" key={s.label}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* PR List */}
        {pulls.length > 0 && (
          <div className="card p-4 mb-6">
            <div className="section-title mb-4">Open Pull Requests</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pulls.slice(0, 8).map((pr) => (
                <div key={pr.number} className="pr-item">
                  <span className="badge badge-low">PR</span>
                  <span className="pr-number">#{pr.number}</span>
                  <span className="pr-title truncate">{pr.title}</span>
                  <span className="text-muted text-xs">{pr.user.login}</span>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: "5px 10px" }}
                    onClick={() => handleAnalyze(pr.number)}
                    disabled={loading}
                  >
                    Analyze PR
                  </button>
                  <a href={pr.html_url} target="_blank" rel="noreferrer"
                    className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }}>
                    View ↗
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Issues */}
        {result ? (
          <div>
            <div className="flex items-center justify-between mb-4" style={{ flexWrap: "wrap", gap: 12 }}>
              <div className="section-title">
                Issues ({filteredIssues.length}
                {filter !== "all" && ` — filtered`})
              </div>
              <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                <div className="filter-bar">
                  {(["all", "critical", "high", "medium", "low"] as SeverityFilter[]).map((f) => (
                    <button key={f} className={`filter-chip ${filter === f ? "active" : ""}`}
                      onClick={() => setFilter(f)}>
                      {f === "all" ? "All" : `${f.charAt(0).toUpperCase() + f.slice(1)} ${counts[f] ? `(${counts[f]})` : ""}`}
                    </button>
                  ))}
                </div>
                <div className="filter-bar">
                  {["all", "security", "bug", "smell", "style"].map((t) => (
                    <button key={t} className={`filter-chip ${typeFilter === t ? "active" : ""}`}
                      onClick={() => setTypeFilter(t)}>
                      {t === "all" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredIssues.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">{filter === "all" ? "🎉" : "🔍"}</div>
                <h3>{filter === "all" ? "No issues found!" : `No ${filter} issues`}</h3>
                <p>{filter === "all" ? "Your code looks clean." : "Try a different filter."}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredIssues.map((issue, i) => (
                  <IssueCard key={issue.id} issue={issue} index={i} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>No analysis yet</h3>
            <p>Click "Analyze Branch" to scan this repository with AI.</p>
            <button className="btn btn-primary mt-4" onClick={() => handleAnalyze()} disabled={loading}>
              {loading ? "Analyzing…" : "Start Analysis"}
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>✕</button>
        </div>
      )}
    </div>
  );
}
