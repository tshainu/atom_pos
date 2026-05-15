import { useState } from "react";
import { useLocation } from "wouter";
import { adminLogin } from "../../lib/adminApi";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const token = await adminLogin(username, password);
      localStorage.setItem("admin_token", token);
      navigate(import.meta.env.VITE_ADMIN_STANDALONE === "true" ? "/" : "/admin");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20,
        padding: "48px 40px",
        width: 360,
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64,
            background: "linear-gradient(135deg, #2BBFB3, #1a9e94)",
            borderRadius: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: 28,
          }}>⚡</div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>ATOM Admin</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: 0 }}>Super Admin Portal</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 12, marginBottom: 6, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              style={{
                width: "100%", padding: "12px 14px", boxSizing: "border-box",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 10, color: "#fff", fontSize: 15, outline: "none",
              }}
              placeholder="superadmin"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 12, marginBottom: 6, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{
                width: "100%", padding: "12px 14px", boxSizing: "border-box",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 10, color: "#fff", fontSize: 15, outline: "none",
              }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(255,80,80,0.15)", border: "1px solid rgba(255,80,80,0.3)",
              borderRadius: 8, padding: "10px 14px", color: "#ff8080", fontSize: 13, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "14px",
              background: loading ? "rgba(43,191,179,0.5)" : "linear-gradient(135deg, #2BBFB3, #1a9e94)",
              border: "none", borderRadius: 10, color: "#fff",
              fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity 0.2s",
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
