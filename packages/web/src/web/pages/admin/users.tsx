import { useEffect, useState } from "react";
import { adminGetUsers, adminSuspendUser, adminCreateUser, adminResetUserPassword, adminGetShops } from "../../lib/adminApi";

const TEAL = "#2BBFB3";

interface User {
  id: number;
  shopId: number;
  shopName: string;
  shopCode: string;
  username: string;
  fullName: string;
  role: string;
  phone: string | null;
  suspended: boolean;
  salary: number;
  createdAt: string;
}

interface Shop { id: number; shopId: string; name: string; }

const roleColor: Record<string, string> = {
  admin: "#c084fc",
  cashier: TEAL,
  salesperson: "#fb923c",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#fff",
  fontSize: 14, outline: "none", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block", color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 4, fontWeight: 600,
};

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Create user modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ shopId: "", fullName: "", username: "", password: "", role: "cashier", phone: "" });
  const [createError, setCreateError] = useState("");

  // Reset password modal
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPw, setNewPw] = useState("");
  const [resetting, setResetting] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      adminGetUsers().then(d => setUsers(d.users)),
      adminGetShops().then(d => setShops(d.shops ?? [])),
    ]).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function toggleSuspend(user: User) {
    setToggling(user.id);
    try {
      await adminSuspendUser(user.id, !user.suspended);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, suspended: !u.suspended } : u));
    } catch {}
    setToggling(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    if (!createForm.shopId || !createForm.fullName || !createForm.username || !createForm.password) {
      setCreateError("All fields except phone are required"); return;
    }
    setCreating(true);
    try {
      await adminCreateUser({
        shopId: Number(createForm.shopId),
        username: createForm.username,
        password: createForm.password,
        fullName: createForm.fullName,
        role: createForm.role,
        phone: createForm.phone || undefined,
      });
      setShowCreate(false);
      setCreateForm({ shopId: "", fullName: "", username: "", password: "", role: "cashier", phone: "" });
      load();
    } catch (err: any) { setCreateError(err.message || "Failed"); }
    finally { setCreating(false); }
  }

  async function handleResetPw(e: React.FormEvent) {
    e.preventDefault();
    if (!resetUser || !newPw) return;
    setResetting(true);
    try {
      await adminResetUserPassword(resetUser.id, newPw);
      alert(`Password reset for @${resetUser.username}`);
      setResetUser(null);
      setNewPw("");
    } catch { alert("Failed"); }
    finally { setResetting(false); }
  }

  const filtered = users.filter(u => {
    const matchSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.shopName.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ color: "#fff", margin: 0, fontSize: 22, fontWeight: 700 }}>Staff / Users</h2>
        <button
          onClick={() => { setShowCreate(true); setCreateError(""); }}
          style={{
            padding: "9px 18px", background: TEAL, border: "none", borderRadius: 8,
            color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}
        >
          + Create User
        </button>
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <form onSubmit={handleCreate} style={{
            background: "#1a1f2e", borderRadius: 14, padding: 28, width: 420, maxWidth: "95vw",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <h3 style={{ color: "#fff", margin: "0 0 20px", fontSize: 18 }}>Create New User</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Shop *</label>
                <select value={createForm.shopId} onChange={e => setCreateForm(p => ({ ...p, shopId: e.target.value }))} style={inputStyle}>
                  <option value="">Select shop...</option>
                  {shops.map(s => <option key={s.id} value={s.id}>{s.name} ({s.shopId})</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input style={inputStyle} value={createForm.fullName} onChange={e => setCreateForm(p => ({ ...p, fullName: e.target.value }))} placeholder="Full name" />
              </div>
              <div>
                <label style={labelStyle}>Username *</label>
                <input style={inputStyle} value={createForm.username} onChange={e => setCreateForm(p => ({ ...p, username: e.target.value.toLowerCase() }))} placeholder="username (lowercase)" />
              </div>
              <div>
                <label style={labelStyle}>Password *</label>
                <input style={inputStyle} type="password" value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} placeholder="Set password" />
              </div>
              <div>
                <label style={labelStyle}>Role *</label>
                <select value={createForm.role} onChange={e => setCreateForm(p => ({ ...p, role: e.target.value }))} style={inputStyle}>
                  <option value="admin">Admin</option>
                  <option value="cashier">Cashier</option>
                  <option value="salesperson">Salesperson</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input style={inputStyle} value={createForm.phone} onChange={e => setCreateForm(p => ({ ...p, phone: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            {createError && <p style={{ color: "#ff8080", fontSize: 13, margin: "12px 0 0" }}>{createError}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button type="button" onClick={() => setShowCreate(false)} style={{ flex: 1, padding: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button type="submit" disabled={creating} style={{ flex: 2, padding: "10px", background: TEAL, border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: creating ? "not-allowed" : "pointer", opacity: creating ? 0.7 : 1 }}>
                {creating ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetUser && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <form onSubmit={handleResetPw} style={{
            background: "#1a1f2e", borderRadius: 14, padding: 28, width: 360, maxWidth: "95vw",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <h3 style={{ color: "#fff", margin: "0 0 6px", fontSize: 18 }}>Reset Password</h3>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 18px" }}>@{resetUser.username} — {resetUser.fullName}</p>
            <label style={labelStyle}>New Password *</label>
            <input style={inputStyle} type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password" autoFocus />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button type="button" onClick={() => { setResetUser(null); setNewPw(""); }} style={{ flex: 1, padding: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button type="submit" disabled={resetting} style={{ flex: 2, padding: "10px", background: "#f59e0b", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: resetting ? "not-allowed" : "pointer", opacity: resetting ? 0.7 : 1 }}>
                {resetting ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          placeholder="Search by name, username, shop..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, maxWidth: 320, padding: "9px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none" }}
        />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ padding: "9px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none" }}>
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="cashier">Cashier</option>
          <option value="salesperson">Salesperson</option>
        </select>
      </div>

      {loading ? (
        <p style={{ color: "rgba(255,255,255,0.3)" }}>Loading...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(user => (
            <div key={user.id} style={{
              background: user.suspended ? "rgba(255,80,80,0.05)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${user.suspended ? "rgba(255,80,80,0.2)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 12, padding: "14px 18px",
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${roleColor[user.role] || TEAL}44, ${roleColor[user.role] || TEAL}22)`,
                    border: `1px solid ${roleColor[user.role] || TEAL}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: roleColor[user.role] || TEAL, fontWeight: 700, fontSize: 14, flexShrink: 0,
                  }}>
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{user.fullName}</span>
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: `${roleColor[user.role] || TEAL}22`, color: roleColor[user.role] || TEAL, fontWeight: 600, textTransform: "uppercase" }}>
                        {user.role}
                      </span>
                      {user.suspended && (
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "rgba(255,80,80,0.2)", color: "#ff8080", fontWeight: 600 }}>SUSPENDED</span>
                      )}
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                      @{user.username} • {user.shopName} ({user.shopCode})
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {user.phone && <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{user.phone}</span>}
                <button
                  onClick={() => { setResetUser(user); setNewPw(""); }}
                  style={{ padding: "6px 12px", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8, color: "#f59e0b", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  Reset PW
                </button>
                <button
                  onClick={() => toggleSuspend(user)}
                  disabled={toggling === user.id}
                  style={{ padding: "6px 14px", background: user.suspended ? "rgba(43,191,179,0.15)" : "rgba(255,80,80,0.15)", border: `1px solid ${user.suspended ? "rgba(43,191,179,0.3)" : "rgba(255,80,80,0.3)"}`, borderRadius: 8, color: user.suspended ? TEAL : "#ff8080", fontSize: 12, fontWeight: 600, cursor: toggling === user.id ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
                >
                  {toggling === user.id ? "..." : user.suspended ? "Unsuspend" : "Suspend"}
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 40 }}>No users found</p>
          )}
        </div>
      )}
    </div>
  );
}
