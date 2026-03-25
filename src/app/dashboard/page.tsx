"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import SecurityScore from "@/components/SecurityScore";

interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  private: boolean;
  open_issues_count: number;
  owner: { login: string };
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f7df1e", Python: "#3572A5",
  Go: "#00add8", Rust: "#dea584", Java: "#b07219", "C++": "#f34b7d",
  Ruby: "#701516", PHP: "#4f5d95",
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<"all" | "public" | "private">("all");

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetch("/api/repos")
      .then((r) => r.json())
      .then((d) => { setRepos(d.repos ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleAnalyze = useCallback(async (owner: string, repo: string, e: React.MouseEvent) => {
    e.preventDefault();
    const key = `${owner}/${repo}`;
    setAnalyzing(key);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setScores((s) => ({ ...s, [key]: data.securityScore }));
      showToast(`✅ Analysis done! ${data.totalIssues} issues found. Score: ${data.securityScore}/100`);
    } catch (err: any) {
      showToast(err.message ?? "Analysis failed", "error");
    } finally {
      setAnalyzing(null);
    }
  }, []);

  const filtered = repos.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "private" ? r.private : !r.private);
    return matchSearch && matchFilter;
  });

  return (
    <div className="gradient-bg min-h-screen">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-logo">
          <div className="navbar-logo-icon">🤖</div>
          AI Code Review
        </div>
        <div className="navbar-actions">
          {(session?.user as any)?.image && (
            <img src={(session?.user as any).image} alt="avatar" className="avatar" />
          )}
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{(session?.user as any)?.name}</span>
          <button className="btn btn-ghost" style={{ fontSize: 13, padding: "7px 14px" }}
            onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign out
          </button>
        </div>
      </nav>

      <div className="page-wrap">
        {/* Banner Header */}
        <div style={{
          marginBottom: 32,
          padding: "40px",
          borderRadius: 24,
          background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(79,70,229,0.05))",
          border: "1px solid rgba(99,102,241,0.2)",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Decorative blobs */}
          <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, background: "rgba(99,102,241,0.2)", filter: "blur(60px)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", bottom: -50, left: 100, width: 150, height: 150, background: "rgba(236,72,153,0.15)", filter: "blur(50px)", borderRadius: "50%" }} />
          
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 24,
              background: "linear-gradient(135deg, #6366f1, #ec4899)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36,
              boxShadow: "0 0 30px rgba(99,102,241,0.3)"
            }}>🚀</div>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, background: "linear-gradient(to right, #fff, #a5b4fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Welcome to your command center
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: 15, maxWidth: 600 }}>
                Select a repository below to initiate an AI-powered security audit. Our agent will analyze your code, detect vulnerabilities, and suggest Gemini-powered fixes.
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 mb-6" style={{ flexWrap: "wrap" }}>
          <input
            className="input"
            style={{ maxWidth: 320 }}
            placeholder="Search repositories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="filter-bar">
            {(["all", "public", "private"] as const).map((f) => (
              <button key={f} className={`filter-chip ${filter === f ? "active" : ""}`}
                onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-muted)", alignSelf: "center" }}>
            {filtered.length} repos
          </div>
        </div>

        {/* Repo grid */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
            <span className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📂</div>
            <h3>No repositories found</h3>
            <p>Try a different search or connect your GitHub account.</p>
          </div>
        ) : (
          <div className="grid-2">
            {filtered.map((repo) => {
              const key = `${repo.owner.login}/${repo.name}`;
              const score = scores[key];
              const isAnalyzing = analyzing === key;
              return (
                <div key={repo.id} className="repo-card">
                  <div className="flex items-center justify-between">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/dashboard/${repo.owner.login}/${repo.name}`}
                        style={{ textDecoration: "none" }}>
                        <div className="repo-name truncate">{repo.name}</div>
                      </Link>
                      {repo.private && (
                        <span className="badge badge-medium" style={{ marginTop: 4, fontSize: 10 }}>🔒 Private</span>
                      )}
                    </div>
                    {score !== undefined && (
                      <SecurityScore score={score} size={60} fontSize={13} />
                    )}
                  </div>

                  <p className="repo-desc" style={{ minHeight: 36 }}>
                    {repo.description ?? "No description"}
                  </p>

                  <div className="repo-meta">
                    {repo.language && (
                      <span className="repo-lang">
                        <span className="lang-dot" style={{ background: LANG_COLORS[repo.language] ?? "var(--accent)" }} />
                        {repo.language}
                      </span>
                    )}
                    <span>⭐ {repo.stargazers_count}</span>
                    <span>🐛 {repo.open_issues_count}</span>
                    <span>
                      {new Date(repo.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1, justifyContent: "center", padding: "9px 12px", fontSize: 13 }}
                      disabled={isAnalyzing}
                      onClick={(e) => handleAnalyze(repo.owner.login, repo.name, e)}
                    >
                      {isAnalyzing ? (
                        <><span className="spinner" style={{ width: 14, height: 14 }} /> Analyzing…</>
                      ) : "🔍 Analyze"}
                    </button>
                    <Link
                      href={`/dashboard/${repo.owner.login}/${repo.name}`}
                      className="btn btn-ghost"
                      style={{ flex: 1, justifyContent: "center", padding: "9px 12px", fontSize: 13 }}
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
      )}
    </div>
  );
}
