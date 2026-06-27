import { useState } from "react";
import { adminChangePassword } from "../../lib/adminApi";

const TEAL = "#2BBFB3";

export default function AdminSettings() {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await adminChangePassword(newPassword);
      setSuccess("Password updated successfully!");
      setNewPassword("");
      setConfirm("");
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>Settings</h2>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 28px" }}>
        Manage super admin account settings
      </p>

      {/* Change Password Card */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "28px 24px",
      }}>
        <h3 style={{ color: "#fff", fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>
          🔑 Change Password
        </h3>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: "0 0 24px" }}>
          No old password required
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "block", color: "rgba(255,255,255,0.5)", fontSize: 11,
              fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6,
            }}>
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "11px 14px",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 9, color: "#fff", fontSize: 14, outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: "block", color: "rgba(255,255,255,0.5)", fontSize: 11,
              fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6,
            }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter new password"
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "11px 14px",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 9, color: "#fff", fontSize: 14, outline: "none",
              }}
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.25)",
              borderRadius: 8, padding: "10px 14px", color: "#ff8888", fontSize: 13, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              background: "rgba(43,191,179,0.12)", border: "1px solid rgba(43,191,179,0.25)",
              borderRadius: 8, padding: "10px 14px", color: TEAL, fontSize: 13, marginBottom: 16,
            }}>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "11px 24px",
              background: loading ? "rgba(43,191,179,0.4)" : `linear-gradient(135deg, ${TEAL}, #1a9e94)`,
              border: "none", borderRadius: 9, color: "#fff",
              fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity 0.15s",
            }}
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
