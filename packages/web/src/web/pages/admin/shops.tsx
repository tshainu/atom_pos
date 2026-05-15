import { useEffect, useState } from "react";
import { adminGetShops, adminSuspendShop, adminCreateShop, adminUpdateShop, adminUpdateShopPassword } from "../../lib/adminApi";

const TEAL = "#2BBFB3";
const RED = "#ff8080";

interface Shop {
  id: number; shopId: string; name: string;
  address: string | null; phone: string | null;
  ownerName: string | null; ownerContact: string | null;
  suspended: boolean; salesCount: number; usersCount: number;
  revenueToday: number; revenueMonth: number; revenueYear: number;
  categoriesCount: number; itemsCount: number; createdAt: string;
}

function fmt(n: number) {
  return (n ?? 0).toLocaleString("en-LK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function genShopId() {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const letter = alpha[Math.floor(Math.random() * alpha.length)];
  const digits = String(Math.floor(100 + Math.random() * 900));
  return letter + digits;
}

function Field({ label, value, onChange, placeholder, type = "text" }: any) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "10px 12px", boxSizing: "border-box", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none" }} />
    </div>
  );
}

export default function Shops() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  // Add shop modal
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [newShop, setNewShop] = useState({ shopId: genShopId(), name: "", ownerName: "", ownerContact: "", address: "", phone: "", adminPassword: "" });

  // Edit shop modal
  const [editShop, setEditShop] = useState<Shop | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // Password modal
  const [pwShop, setPwShop] = useState<Shop | null>(null);
  const [newPw, setNewPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");

  // Expanded shop
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    adminGetShops().then((d: any) => setShops(d.shops)).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function toggleSuspend(shop: Shop) {
    setToggling(shop.id);
    try {
      await adminSuspendShop(shop.id, !shop.suspended);
      setShops(prev => prev.map(s => s.id === shop.id ? { ...s, suspended: !s.suspended } : s));
    } catch {}
    setToggling(null);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    if (!newShop.shopId || !newShop.name) { setAddError("Shop ID and Name required"); return; }
    setAdding(true);
    try {
      const result = await adminCreateShop(newShop);
      setShowAdd(false);
      const username = result.shop?.shopId?.toLowerCase() ?? newShop.shopId.toLowerCase();
      const pw = newShop.adminPassword || "admin123";
      alert(`Shop created!\n\nLogin credentials for the app:\nShop ID: ${newShop.shopId}\nUsername: ${username}\nPassword: ${pw}`);
      setNewShop({ shopId: genShopId(), name: "", ownerName: "", ownerContact: "", address: "", phone: "", adminPassword: "" });
      load();
    } catch (err: any) { setAddError(err.message || "Failed"); }
    finally { setAdding(false); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editShop) return;
    setSaving(true);
    try {
      await adminUpdateShop(editShop.id, editData);
      setShops(prev => prev.map(s => s.id === editShop.id ? { ...s, ...editData } : s));
      setEditShop(null);
    } catch {}
    setSaving(false);
  }

  async function handlePwUpdate(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (!newPw || newPw.length < 4) { setPwError("Min 4 characters"); return; }
    if (!pwShop) return;
    setPwSaving(true);
    try {
      await adminUpdateShopPassword(pwShop.id, newPw);
      setPwShop(null); setNewPw("");
    } catch (err: any) { setPwError(err.message || "Failed"); }
    setPwSaving(false);
  }

  const filtered = shops.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.shopId.toLowerCase().includes(search.toLowerCase()) ||
    (s.ownerName || "").toLowerCase().includes(search.toLowerCase())
  );

  const modalStyle: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 100,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const boxStyle: React.CSSProperties = {
    background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16, padding: 28, width: 400, maxHeight: "90vh", overflowY: "auto",
  };
  const btnPrimary: React.CSSProperties = { padding: "9px 20px", background: `linear-gradient(135deg, ${TEAL}, #1a9e94)`, border: "none", borderRadius: 8, color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" };
  const btnGhost: React.CSSProperties = { padding: "9px 18px", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13 };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ color: "#fff", margin: 0, fontSize: 22, fontWeight: 700 }}>Shop Management</h2>
        <button onClick={() => { setNewShop({ shopId: genShopId(), name: "", ownerName: "", ownerContact: "", address: "", phone: "", adminPassword: "" }); setShowAdd(true); }} style={btnPrimary}>
          + New Shop
        </button>
      </div>

      {/* Search */}
      <input placeholder="Search by name, ID, or owner..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: "100%", maxWidth: 340, padding: "9px 14px", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", marginBottom: 18 }} />

      {/* ── Add Shop Modal ── */}
      {showAdd && (
        <div style={modalStyle}>
          <div style={boxStyle}>
            <h3 style={{ color: "#fff", margin: "0 0 20px", fontSize: 18 }}>Add New Shop</h3>
            <form onSubmit={handleAdd}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Shop ID</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={newShop.shopId} onChange={e => setNewShop(p => ({ ...p, shopId: e.target.value.toUpperCase() }))}
                    placeholder="C429" maxLength={6}
                    style={{ flex: 1, padding: "10px 12px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none" }} />
                  <button type="button" onClick={() => setNewShop(p => ({ ...p, shopId: genShopId() }))}
                    style={{ padding: "10px 14px", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 12 }}>
                    🔄
                  </button>
                </div>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: "4px 0 0" }}>Format: 1 letter + 3 digits (e.g. C429)</p>
              </div>
              <Field label="Business Name *" value={newShop.name} onChange={(v: string) => setNewShop(p => ({ ...p, name: v }))} placeholder="My Store" />
              <Field label="Owner Name" value={newShop.ownerName} onChange={(v: string) => setNewShop(p => ({ ...p, ownerName: v }))} placeholder="John Silva" />
              <Field label="Owner Contact" value={newShop.ownerContact} onChange={(v: string) => setNewShop(p => ({ ...p, ownerContact: v }))} placeholder="+94771234567" />
              <Field label="Location" value={newShop.address} onChange={(v: string) => setNewShop(p => ({ ...p, address: v }))} placeholder="Colombo 03" />
              <Field label="Phone" value={newShop.phone} onChange={(v: string) => setNewShop(p => ({ ...p, phone: v }))} placeholder="+94112345678" />
              <Field label="Admin Password" value={newShop.adminPassword} onChange={(v: string) => setNewShop(p => ({ ...p, adminPassword: v }))} placeholder="Set login password" type="password" />
              {addError && <p style={{ color: RED, fontSize: 13, margin: "0 0 12px" }}>{addError}</p>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowAdd(false)} style={btnGhost}>Cancel</button>
                <button type="submit" disabled={adding} style={btnPrimary}>{adding ? "Creating..." : "Create Shop"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Shop Modal ── */}
      {editShop && (
        <div style={modalStyle}>
          <div style={boxStyle}>
            <h3 style={{ color: "#fff", margin: "0 0 20px", fontSize: 18 }}>Edit Shop — {editShop.shopId}</h3>
            <form onSubmit={handleEdit}>
              <Field label="Business Name" value={editData.name ?? ""} onChange={(v: string) => setEditData((p: any) => ({ ...p, name: v }))} placeholder="My Store" />
              <Field label="Owner Name" value={editData.ownerName ?? ""} onChange={(v: string) => setEditData((p: any) => ({ ...p, ownerName: v }))} placeholder="John Silva" />
              <Field label="Owner Contact" value={editData.ownerContact ?? ""} onChange={(v: string) => setEditData((p: any) => ({ ...p, ownerContact: v }))} placeholder="+94771234567" />
              <Field label="Location" value={editData.address ?? ""} onChange={(v: string) => setEditData((p: any) => ({ ...p, address: v }))} placeholder="Colombo 03" />
              <Field label="Phone" value={editData.phone ?? ""} onChange={(v: string) => setEditData((p: any) => ({ ...p, phone: v }))} placeholder="+94112345678" />
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setEditShop(null)} style={btnGhost}>Cancel</button>
                <button type="submit" disabled={saving} style={btnPrimary}>{saving ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Update Password Modal ── */}
      {pwShop && (
        <div style={modalStyle}>
          <div style={{ ...boxStyle, width: 340 }}>
            <h3 style={{ color: "#fff", margin: "0 0 6px", fontSize: 18 }}>Update Admin Password</h3>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 20px" }}>{pwShop.name} ({pwShop.shopId})</p>
            <form onSubmit={handlePwUpdate}>
              <Field label="New Password" value={newPw} onChange={setNewPw} placeholder="Min 4 characters" type="password" />
              {pwError && <p style={{ color: RED, fontSize: 13, margin: "0 0 12px" }}>{pwError}</p>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => { setPwShop(null); setNewPw(""); setPwError(""); }} style={btnGhost}>Cancel</button>
                <button type="submit" disabled={pwSaving} style={btnPrimary}>{pwSaving ? "Updating..." : "Update"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shop List */}
      {loading ? (
        <p style={{ color: "rgba(255,255,255,0.3)" }}>Loading...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(shop => {
            const isExpanded = expanded === shop.id;
            return (
              <div key={shop.id} style={{
                background: shop.suspended ? "rgba(255,80,80,0.05)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${shop.suspended ? "rgba(255,80,80,0.2)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 12, overflow: "hidden",
              }}>
                {/* Main row */}
                <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, cursor: "pointer" }}
                  onClick={() => setExpanded(isExpanded ? null : shop.id)}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>{shop.name}</span>
                      <span style={{
                        fontSize: 10, padding: "2px 7px", borderRadius: 20, fontWeight: 700,
                        background: shop.suspended ? "rgba(255,80,80,0.2)" : "rgba(43,191,179,0.15)",
                        color: shop.suspended ? RED : TEAL,
                      }}>{shop.suspended ? "SUSPENDED" : "ACTIVE"}</span>
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 3 }}>
                      <span style={{ color: TEAL, fontWeight: 600 }}>{shop.shopId}</span>
                      {shop.ownerName ? ` • ${shop.ownerName}` : ""}
                      {shop.ownerContact ? ` • ${shop.ownerContact}` : ""}
                      {shop.address ? ` • ${shop.address}` : ""}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <StatChip label="Staff" value={shop.usersCount} />
                    <StatChip label="Items" value={shop.itemsCount} />
                    <StatChip label="Cats" value={shop.categoriesCount} />
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 18 }}>{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "14px 18px" }}>
                    {/* Revenue row */}
                    <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                      <RevCard label="Today" value={shop.revenueToday} />
                      <RevCard label="This Month" value={shop.revenueMonth} />
                      <RevCard label="This Year" value={shop.revenueYear} />
                    </div>
                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => { setEditShop(shop); setEditData({ name: shop.name, ownerName: shop.ownerName ?? "", ownerContact: shop.ownerContact ?? "", address: shop.address ?? "", phone: shop.phone ?? "" }); }}
                        style={{ padding: "7px 14px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff", fontSize: 12, cursor: "pointer" }}>
                        ✏️ Edit
                      </button>
                      <button onClick={() => { setPwShop(shop); setNewPw(""); setPwError(""); }}
                        style={{ padding: "7px 14px", background: "rgba(255,200,50,0.1)", border: "1px solid rgba(255,200,50,0.25)", borderRadius: 8, color: "#fcd34d", fontSize: 12, cursor: "pointer" }}>
                        🔑 Update Password
                      </button>
                      <button onClick={() => toggleSuspend(shop)} disabled={toggling === shop.id}
                        style={{ padding: "7px 14px", background: shop.suspended ? "rgba(43,191,179,0.1)" : "rgba(255,80,80,0.1)", border: `1px solid ${shop.suspended ? "rgba(43,191,179,0.25)" : "rgba(255,80,80,0.25)"}`, borderRadius: 8, color: shop.suspended ? TEAL : RED, fontSize: 12, cursor: "pointer" }}>
                        {toggling === shop.id ? "..." : shop.suspended ? "✅ Unsuspend" : "🚫 Suspend"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 40 }}>No shops found</p>
          )}
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{value}</div>
      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>{label}</div>
    </div>
  );
}

function RevCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 16px", flex: 1, minWidth: 120 }}>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color: TEAL, fontWeight: 700, fontSize: 16 }}>Rs. {fmt(value)}</div>
    </div>
  );
}
