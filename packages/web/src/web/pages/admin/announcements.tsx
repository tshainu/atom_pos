import { useEffect, useState } from "react";
import {
  adminGetAnnouncements, adminCreateAnnouncement,
  adminUpdateAnnouncement, adminDeleteAnnouncement, adminGetShops,
} from "../../lib/adminApi";

const TEAL = "#2BBFB3";

const PRIORITY_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  normal: { color: "#a3a3a3", bg: "rgba(163,163,163,0.12)", label: "Normal" },
  important: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "Important" },
  urgent: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "Urgent" },
};

function fmt(ts: any): string {
  if (!ts) return "-";
  const d = ts instanceof Date ? ts : new Date(typeof ts === "number" && ts < 1e12 ? ts * 1000 : ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const EMPTY_FORM = { title: "", body: "", priority: "normal", targetShopId: "" as string | number, expiresAt: "" };

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    load();
    adminGetShops().then(d => setShops(d.shops ?? []));
  }, []);

  async function load() {
    setLoading(true);
    try {
      const d = await adminGetAnnouncements();
      setAnnouncements(d.announcements ?? []);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(ann: any) {
    setForm({
      title: ann.title,
      body: ann.body,
      priority: ann.priority,
      targetShopId: ann.targetShopId ?? "",
      expiresAt: ann.expiresAt ? new Date(ann.expiresAt instanceof Date ? ann.expiresAt : ann.expiresAt * 1000).toISOString().slice(0, 10) : "",
    });
    setEditId(ann.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        body: form.body,
        priority: form.priority,
        targetShopId: form.targetShopId === "" ? null : Number(form.targetShopId),
        expiresAt: form.expiresAt || null,
      };
      if (editId) {
        await adminUpdateAnnouncement(editId, payload);
      } else {
        await adminCreateAnnouncement(payload);
      }
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(ann: any) {
    await adminUpdateAnnouncement(ann.id, { isActive: !ann.isActive });
    await load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this announcement?")) return;
    await adminDeleteAnnouncement(id);
    await load();
  }

  const activeCount = announcements.filter(a => a.isActive).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>Announcements</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4 }}>
            Broadcast messages to shops — {activeCount} active
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            background: TEAL, border: "none", borderRadius: 10, color: "#0d0d1a",
            fontWeight: 700, fontSize: 13, padding: "10px 20px", cursor: "pointer",
          }}
        >
          + New Announcement
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: "#13131f", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16, padding: 28, width: "min(560px, 90vw)", maxHeight: "90vh", overflow: "auto",
          }}>
            <h3 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: "0 0 20px" }}>
              {editId ? "Edit Announcement" : "New Announcement"}
            </h3>

            {(["title", "body"] as const).map(field => (
              <div key={field} style={{ marginBottom: 16 }}>
                <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, display: "block", marginBottom: 6 }}>
                  {field.toUpperCase()} *
                </label>
                {field === "body" ? (
                  <textarea
                    value={form[field]}
                    onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                    rows={4}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8, color: "#fff", padding: "10px 12px", fontSize: 13,
                      resize: "vertical", fontFamily: "inherit",
                    }}
                  />
                ) : (
                  <input
                    value={form[field]}
                    onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8, color: "#fff", padding: "10px 12px", fontSize: 13,
                    }}
                  />
                )}
              </div>
            ))}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, display: "block", marginBottom: 6 }}>PRIORITY</label>
                <select
                  value={form.priority}
                  onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8, color: "#fff", padding: "10px 12px", fontSize: 13,
                  }}
                >
                  <option value="normal">Normal</option>
                  <option value="important">Important</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, display: "block", marginBottom: 6 }}>TARGET SHOP</label>
                <select
                  value={form.targetShopId}
                  onChange={e => setForm(p => ({ ...p, targetShopId: e.target.value }))}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8, color: "#fff", padding: "10px 12px", fontSize: 13,
                  }}
                >
                  <option value="">All Shops</option>
                  {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, display: "block", marginBottom: 6 }}>EXPIRES ON (optional)</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8, color: "#fff", padding: "10px 12px", fontSize: 13,
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleSave} disabled={saving || !form.title.trim() || !form.body.trim()}
                style={{
                  flex: 1, background: TEAL, border: "none", borderRadius: 10,
                  color: "#0d0d1a", fontWeight: 700, fontSize: 14, padding: "12px",
                  cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Saving..." : editId ? "Save Changes" : "Create"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10, color: "rgba(255,255,255,0.6)", fontSize: 14, padding: "12px", cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.3)" }}>Loading...</div>
      )}

      {!loading && announcements.length === 0 && (
        <div style={{
          textAlign: "center", padding: "80px 0",
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📢</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 15 }}>No announcements yet</div>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 6 }}>
            Create one to broadcast to all shops
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {announcements.map(ann => {
          const ps = PRIORITY_STYLE[ann.priority] ?? PRIORITY_STYLE.normal;
          const isExpanded = expandedId === ann.id;
          const expired = ann.expiresAt && new Date(ann.expiresAt instanceof Date ? ann.expiresAt : ann.expiresAt * 1000) < new Date();

          return (
            <div key={ann.id} style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${ann.isActive && !expired ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}`,
              borderRadius: 12, padding: "16px 20px",
              opacity: ann.isActive && !expired ? 1 : 0.55,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                {/* Priority badge */}
                <span style={{
                  background: ps.bg, color: ps.color,
                  border: `1px solid ${ps.color}30`,
                  borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700,
                  flexShrink: 0, marginTop: 1,
                }}>
                  {ps.label.toUpperCase()}
                </span>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{ann.title}</span>
                    {!ann.isActive && (
                      <span style={{
                        background: "rgba(150,150,150,0.15)", color: "#888",
                        borderRadius: 5, padding: "2px 6px", fontSize: 10,
                      }}>INACTIVE</span>
                    )}
                    {expired && (
                      <span style={{
                        background: "rgba(239,68,68,0.15)", color: "#ef4444",
                        borderRadius: 5, padding: "2px 6px", fontSize: 10,
                      }}>EXPIRED</span>
                    )}
                  </div>

                  <div style={{
                    color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 1.5,
                    whiteSpace: isExpanded ? "pre-wrap" : undefined,
                    overflow: isExpanded ? undefined : "hidden",
                    textOverflow: isExpanded ? undefined : "ellipsis",
                    display: isExpanded ? undefined : "-webkit-box",
                    WebkitLineClamp: isExpanded ? undefined : 2,
                    WebkitBoxOrient: "vertical",
                  } as any}>
                    {ann.body}
                  </div>

                  {ann.body.length > 120 && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : ann.id)}
                      style={{
                        background: "none", border: "none", color: TEAL,
                        fontSize: 12, cursor: "pointer", padding: "4px 0", marginTop: 4,
                      }}
                    >
                      {isExpanded ? "Show less" : "Show more"}
                    </button>
                  )}

                  <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
                      🏪 {ann.shopName}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
                      📅 Created {fmt(ann.createdAt)}
                    </span>
                    {ann.expiresAt && (
                      <span style={{ color: expired ? "#ef4444" : "rgba(255,255,255,0.3)", fontSize: 11 }}>
                        ⌛ Expires {fmt(ann.expiresAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => handleToggle(ann)}
                    title={ann.isActive ? "Deactivate" : "Activate"}
                    style={{
                      background: ann.isActive ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.07)",
                      border: `1px solid ${ann.isActive ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.1)"}`,
                      borderRadius: 8, color: ann.isActive ? "#4ade80" : "rgba(255,255,255,0.4)",
                      padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                    }}
                  >
                    {ann.isActive ? "Active" : "Inactive"}
                  </button>
                  <button
                    onClick={() => openEdit(ann)}
                    style={{
                      background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8, color: "rgba(255,255,255,0.5)",
                      padding: "6px 12px", cursor: "pointer", fontSize: 12,
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(ann.id)}
                    style={{
                      background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                      borderRadius: 8, color: "#ef4444",
                      padding: "6px 12px", cursor: "pointer", fontSize: 12,
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
