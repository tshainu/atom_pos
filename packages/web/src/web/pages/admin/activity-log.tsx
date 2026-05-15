import { useEffect, useState } from "react";
import { adminGetActivityLog, adminGetShops } from "../../lib/adminApi";

const TEAL = "#2BBFB3";

function fmt(ts: any): string {
  if (!ts) return "-";
  const d = ts instanceof Date ? ts : new Date(typeof ts === "number" && ts < 1e12 ? ts * 1000 : ts);
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const ACTION_STYLE: Record<string, { color: string; icon: string }> = {
  login: { color: "#4ade80", icon: "→" },
  logout: { color: "#60a5fa", icon: "←" },
  failed_login: { color: "#ef4444", icon: "✕" },
};

export default function ActivityLog() {
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState<number | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminGetShops().then(d => setShops(d.shops ?? []));
    load(1, null);
  }, []);

  async function load(p: number, shopId: number | null) {
    setLoading(true);
    try {
      const d = await adminGetActivityLog(shopId ?? undefined, p);
      setLogs(d.logs ?? []);
      setTotal(d.total ?? 0);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }

  function handleShopChange(val: string) {
    const id = val === "" ? null : Number(val);
    setSelectedShop(id);
    load(1, id);
  }

  const totalPages = Math.ceil(total / 50);

  const loginCount = logs.filter(l => l.action === "login").length;
  const logoutCount = logs.filter(l => l.action === "logout").length;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>Activity Log</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4 }}>User login / logout events</p>
      </div>

      {/* Filter */}
      <div style={{
        display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 20,
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12, padding: "16px 20px",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>FILTER BY SHOP</label>
          <select
            value={selectedShop ?? ""}
            onChange={e => handleShopChange(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8, color: "#fff", padding: "8px 12px", fontSize: 13, minWidth: 200,
            }}
          >
            <option value="">All Shops</option>
            {shops.map(s => <option key={s.id} value={s.id}>{s.name} ({s.shopId})</option>)}
          </select>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
          {[
            { label: "Total Events", value: total, color: "#fff" },
            { label: "Logins (page)", value: loginCount, color: "#4ade80" },
            { label: "Logouts (page)", value: logoutCount, color: "#60a5fa" },
          ].map(k => (
            <div key={k.label} style={{
              textAlign: "center",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, padding: "8px 16px", minWidth: 90,
            }}>
              <div style={{ color: k.color, fontWeight: 700, fontSize: 20 }}>{k.value}</div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginTop: 2 }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12, overflow: "hidden",
      }}>
        <div style={{
          display: "grid", gridTemplateColumns: "100px 1fr 1fr 120px 1fr",
          padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)",
          color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 600, letterSpacing: 1,
        }}>
          <div>ACTION</div>
          <div>USER</div>
          <div>SHOP</div>
          <div>TIME</div>
          <div>DETAILS</div>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.3)" }}>Loading...</div>
        )}

        {!loading && logs.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.3)" }}>
            No activity yet. Users need to log in first.
          </div>
        )}

        {!loading && logs.map((log, i) => {
          const style = ACTION_STYLE[log.action] ?? { color: "#aaa", icon: "•" };
          return (
            <div key={log.id} style={{
              display: "grid", gridTemplateColumns: "100px 1fr 1fr 120px 1fr",
              padding: "12px 20px",
              borderBottom: i < logs.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              alignItems: "center",
            }}>
              <div>
                <span style={{
                  background: `${style.color}18`,
                  color: style.color,
                  border: `1px solid ${style.color}35`,
                  borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700,
                  display: "inline-flex", alignItems: "center", gap: 4,
                }}>
                  {style.icon} {log.action.replace("_", " ").toUpperCase()}
                </span>
              </div>
              <div>
                <div style={{ color: "#fff", fontSize: 13 }}>{log.userName}</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>@{log.userUsername}</div>
              </div>
              <div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{log.shopName}</div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{log.shopCode}</div>
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{fmt(log.createdAt)}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{log.details ?? "-"}</div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
          <button disabled={page <= 1} onClick={() => load(page - 1, selectedShop)}
            style={{
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8, color: page <= 1 ? "rgba(255,255,255,0.2)" : "#fff",
              padding: "8px 16px", cursor: page <= 1 ? "default" : "pointer", fontSize: 13,
            }}>← Prev</button>
          <div style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, color: "rgba(255,255,255,0.5)", padding: "8px 16px", fontSize: 13,
          }}>Page {page} of {totalPages}</div>
          <button disabled={page >= totalPages} onClick={() => load(page + 1, selectedShop)}
            style={{
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8, color: page >= totalPages ? "rgba(255,255,255,0.2)" : "#fff",
              padding: "8px 16px", cursor: page >= totalPages ? "default" : "pointer", fontSize: 13,
            }}>Next →</button>
        </div>
      )}
    </div>
  );
}
