"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    signIn("github", { callbackUrl: "/dashboard" });
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#0f111a", color: "#fff" }}>
      
      {/* LEFT SIDE: Hero / Branding */}
      <div style={{
        flex: 1,
        position: "relative",
        display: "none",
        padding: "60px",
        overflow: "hidden",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "linear-gradient(135deg, #0f111a 0%, #1e1b4b 100%)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }} className="lg-flex">
        
        {/* Animated background blobs */}
        <div style={{ position: "absolute", top: "10%", left: "20%", width: "50%", height: "50%", background: "rgba(99,102,241,0.15)", filter: "blur(100px)", borderRadius: "50%", animation: "pulse 8s infinite alternate" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "10%", width: "40%", height: "60%", background: "rgba(236,72,153,0.1)", filter: "blur(100px)", borderRadius: "50%", animation: "pulse 10s infinite alternate-reverse" }} />

        {/* Abstract code/terminal graphic setup */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "120%", height: "120%", 
             backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
             backgroundSize: "60px 60px", opacity: 0.5, zIndex: 0 }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
            boxShadow: "0 0 30px rgba(99,102,241,0.4)", marginBottom: 24
          }}>🤖</div>
          <h1 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.1, marginBottom: 20,
            background: "linear-gradient(to right, #ffffff, #a5b4fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
           }}>
            The Future of<br/>Code Review.
          </h1>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", maxWidth: 400, lineHeight: 1.6 }}>
            Automate security scanning, detect hidden vulnerabilities, and instantly get AI-powered fixes right on your GitHub PRs.
          </p>
        </div>

        {/* Floating Code Snippet Card */}
        <div style={{ position: "relative", zIndex: 1, alignSelf: "flex-end", maxWidth: 500, width: "100%", marginRight: "10%" }}>
           <div style={{ 
              background: "rgba(15, 17, 26, 0.6)", backdropFilter: "blur(20px)", borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.1)", padding: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              transform: "rotate(-2deg) translateY(-20px)"
           }}>
             <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }}/>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#eab308" }}/>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }}/>
             </div>
             <pre style={{ margin: 0, fontSize: 13, color: "#a5b4fc", fontFamily: "monospace", overflow: "hidden" }}>
<span style={{color: "#ec4899"}}>function</span> <span style={{color: "#60a5fa"}}>validateUser</span>(input) {"{"}<br/>
  <span style={{color: "#ef4444", textDecoration: "line-through"}}>// SQL Injection Vulnerability!</span><br/>
  <span style={{color: "#ef4444"}}>- db.query(`SELECT * FROM users WHERE name = '${"input"}'`);</span><br/>
  <br/>
  <span style={{color: "#22c55e"}}>// AI Suggested Fix:</span><br/>
  <span style={{color: "#22c55e"}}>+ db.query('SELECT * FROM users WHERE name = ?', [input]);</span><br/>
{"}"}
             </pre>
           </div>
        </div>
      </div>

      {/* RIGHT SIDE: Login Action */}
      <div style={{
        flex: 1, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        padding: "40px 20px",
        background: "#0f111a"
      }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* Mobile Only Logo */}
          <div className="lg-hidden" style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
              boxShadow: "0 0 20px rgba(99,102,241,0.3)"
            }}>🤖</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>AI Code Review Agent</h1>
          </div>

          <div style={{ 
            background: "rgba(255,255,255,0.02)", 
            border: "1px solid rgba(255,255,255,0.08)", 
            borderRadius: 24, 
            padding: "40px 32px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
          }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: "#fff" }}>Welcome back</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 32 }}>
              Sign in with your GitHub account to connect your repositories.
            </p>

            {/* Features List for Login */}
            <div style={{ marginBottom: 32, display: "flex", flexDirection: "column", gap: 16 }}>
              {["🛡️ Identify security flaws instantly", "🤖 Get AI-powered remediation", "📊 Monitor portfolio security scores"].map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(34, 197, 94, 0.1)", color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M13 4L6.5 11.5 3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  {f}
                </div>
              ))}
            </div>

            <button
              style={{
                width: "100%", padding: "14px 24px", fontSize: 16, fontWeight: 600,
                borderRadius: 12, border: "none", cursor: "pointer",
                background: "#fff", color: "#000",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: "rgba(0,0,0,0.2)", borderTopColor: "#000" }} /> Connecting...</>
              ) : (
                <>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#000"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                  Continue with GitHub
                </>
              )}
            </button>
            <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
              By continuing, you grant read-only access to your repositories.
            </p>
          </div>
        </div>
      </div>
      
      {/* Required CSS for responsive layout mapping */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (min-width: 1024px) {
          .lg-flex { display: flex !important; }
          .lg-hidden { display: none !important; }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.1); opacity: 0.5; }
        }
      `}} />
    </div>
  );
}
