"use client";
import { useState } from "react";
import { useParams } from "next/navigation";

export interface EnrichedIssue {
  id: string;
  filePath: string;
  line?: number;
  column?: number;
  severity: string;
  type: string;
  ruleId: string;
  message: string;
  source?: string;
  explanation: string;
  fix: string;
  bestPractice: string;
  fixedCode?: string;
}

interface Props {
  issue: EnrichedIssue;
  index: number;
}

const SEVERITY_BADGE: Record<string, string> = {
  critical: "badge-critical",
  high: "badge-high",
  medium: "badge-medium",
  low: "badge-low",
};

const SEVERITY_ICON: Record<string, string> = {
  critical: "🔴", high: "🟠", medium: "🟡", low: "🟢",
};

const TYPE_ICON: Record<string, string> = {
  security: "🛡️", bug: "🐛", smell: "👃", style: "✨",
};

export default function IssueCard({ issue, index }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"explain" | "fix" | "code">("explain");
  const params = useParams() as { owner?: string; repo?: string };
  const owner = params?.owner;
  const repo = params?.repo;

  const [isFixing, setIsFixing] = useState(false);
  const [fixUrl, setFixUrl] = useState<string | null>(null);
  const [fixError, setFixError] = useState<string | null>(null);

  const handleAutoFix = async () => {
    if (!owner || !repo) return;
    setIsFixing(true);
    setFixError(null);
    try {
      const res = await fetch("/api/fix-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo, issue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create PR");
      setFixUrl(data.prUrl);
    } catch (err: any) {
      setFixError(err.message);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="issue-card" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="issue-header" onClick={() => setOpen(!open)}>
        <span style={{ fontSize: 16, marginTop: 1 }}>{SEVERITY_ICON[issue.severity] ?? "⚪"}</span>
        <div className="issue-meta">
          <div className="issue-file">
            {TYPE_ICON[issue.type] ?? "📄"} {issue.filePath}
            {issue.line && <span style={{ color: "var(--accent-light)" }}>:{issue.line}</span>}
          </div>
          <div className="issue-msg">{issue.message}</div>
          <div className="flex gap-2 mt-2">
            <span className={`badge ${SEVERITY_BADGE[issue.severity] ?? "badge-low"}`}>{issue.severity}</span>
            <span className="badge" style={{ background: "var(--bg-glass)", color: "var(--text-muted)", border: "1px solid var(--border)", fontSize: 10 }}>
              {issue.ruleId}
            </span>
          </div>
        </div>
        <span className={`chevron ${open ? "open" : ""}`} style={{ fontSize: 14, userSelect: "none" }}>▶</span>
      </div>

      {open && (
        <div className="issue-body">
          {/* Source snippet */}
          {issue.source && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: 6 }}>Code at issue</div>
              <div className="code-block before" style={{ fontSize: 12 }}>{issue.source}</div>
            </div>
          )}

          {/* Tabs */}
          <div className="tab-bar" style={{ marginBottom: 0 }}>
            {(["explain", "fix", "code"] as const).map((t) => (
              <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
                {t === "explain" ? "💡 Explanation" : t === "fix" ? "🔧 How to fix" : "📝 Fixed code"}
              </button>
            ))}
          </div>

          {tab === "explain" && (
            <div className="ai-section">
              <p>{issue.explanation}</p>
              {issue.bestPractice && (
                <div style={{
                  marginTop: 10, padding: "10px 12px", borderRadius: 8,
                  background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
                  fontSize: 13, color: "var(--text-secondary)"
                }}>
                  💡 <strong>Best practice:</strong> {issue.bestPractice}
                </div>
              )}
            </div>
          )}

          {tab === "fix" && (
            <div className="ai-section">
              <p>{issue.fix}</p>
            </div>
          )}

          {tab === "code" && (
            <div>
              {issue.source && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--critical)", marginBottom: 6, textTransform: "uppercase" }}>Before</div>
                  <div className="code-block before">{issue.source}</div>
                </>
              )}
              {issue.fixedCode ? (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--low)", margin: "12px 0 6px", textTransform: "uppercase" }}>After</div>
                  <div className="code-block after">{issue.fixedCode}</div>
                </>
              ) : <p className="text-secondary text-sm" style={{ marginTop: 8 }}>No fixed code snippet available for this issue.</p>}
            </div>
          )}

          {/* Action Footer */}
          {owner && repo && (
            <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              {fixUrl ? (
                <a href={fixUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ fontSize: 13, background: "var(--low)", color: "#000", fontWeight: 700 }}>
                  ✅ PR Created! View on GitHub ↗
                </a>
              ) : (
                <div className="flex gap-3 items-center" style={{ flexWrap: "wrap" }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ fontSize: 13, padding: "8px 16px" }} 
                    onClick={handleAutoFix} 
                    disabled={isFixing}
                  >
                    {isFixing ? (
                      <><span className="spinner" style={{ width: 12, height: 12 }} /> Creating PR...</>
                    ) : (
                      "🚀 Auto-Fix on GitHub"
                    )}
                  </button>
                  {fixError && <span style={{ color: "var(--critical)", fontSize: 12 }}>{fixError}</span>}
                </div>
              )}
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                *This will generate a Pull Request for you to review without merging.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
