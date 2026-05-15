import { useEffect, useState } from "react";
import { adminGetTransactions, adminGetShops } from "../../lib/adminApi";

const TEAL = "#2BBFB3";

function fmt(ts: any): string {
  if (!ts) return "-";
  const d = ts instanceof Date ? ts : new Date(typeof ts === "number" && ts < 1e12 ? ts * 1000 : ts);
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtMoney(n: number) {
  return "Rs " + (n ?? 0).toLocaleString("en-LK", { minimumFractionDigits: 2 });
}

const STATUS_COLOR: Record<string, string> = {
  completed: "#2BBFB3",
  held: "#f59e0b",
  cancelled: "#ef4444",
};

const PM_COLOR: Record<string, string> = {
  cash: "#4ade80",
  card: "#60a5fa",
  credit: "#f97316",
};

export default function Transactions() {
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState<number | null>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminGetShops().then((d) => {
      setShops(d.shops ?? []);
      if (d.shops?.length) setSelectedShop(d.shops[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedShop) return;
    load(1);
  }, [selectedShop]);

  async function load(p: number) {
    if (!selectedShop) return;
    setLoading(true);
    try {
      const d = await adminGetTransactions(selectedShop, p, from || undefined, to || undefined);
      setSales(d.sales ?? []);
      setTotal(d.total ?? 0);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(total / 50);
  const completedAmount = sales.filter(s => s.status === "completed").reduce((s, x) => s + x.netPay, 0);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>Transactions</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4 }}>Per-shop transaction history</p>
      </div>

      {/* Filters */}
      <div style={{
        display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20,
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12, padding: "16px 20px", alignItems: "flex-end",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>SHOP</label>
          <select
            value={selectedShop ?? ""}
            onChange={e => setSelectedShop(Number(e.target.value))}
            style={{
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8, color: "#fff", padding: "8px 12px", fontSize: 13, minWidth: 160,
            }}
          >
            {shops.map(s => <option key={s.id} value={s.id}>{s.name} ({s.shopId})</option>)}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>FROM</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8, color: "#fff", padding: "8px 12px", fontSize: 13,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>TO</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8, color: "#fff", padding: "8px 12px", fontSize: 13,
            }}
          />
        </div>

        <button
          onClick={() => load(1)}
          style={{
            background: TEAL, border: "none", borderRadius: 8, color: "#0d0d1a",
            fontWeight: 700, fontSize: 13, padding: "9px 20px", cursor: "pointer",
          }}
        >
          Filter
        </button>

        <button
          onClick={() => { setFrom(""); setTo(""); setTimeout(() => load(1), 50); }}
          style={{
            background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8, color: "rgba(255,255,255,0.5)", fontSize: 13, padding: "9px 16px", cursor: "pointer",
          }}
        >
          Clear
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Bills", value: total },
          { label: "Showing", value: sales.length },
          { label: "Revenue (page)", value: fmtMoney(completedAmount) },
        ].map(k => (
          <div key={k.label} style={{
            flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10, padding: "12px 16px",
          }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 4 }}>{k.label}</div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12, overflow: "hidden",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "90px 1fr 1fr 120px 110px 110px",
          padding: "12px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 600, letterSpacing: 1,
        }}>
          <div>BILL #</div>
          <div>STAFF</div>
          <div>DATE</div>
          <div>METHOD</div>
          <div>STATUS</div>
          <div style={{ textAlign: "right" }}>AMOUNT</div>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.3)" }}>
            Loading...
          </div>
        )}

        {!loading && sales.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.3)" }}>
            No transactions found
          </div>
        )}

        {!loading && sales.map((s, i) => (
          <div key={s.id} style={{
            display: "grid",
            gridTemplateColumns: "90px 1fr 1fr 120px 110px 110px",
            padding: "12px 20px",
            borderBottom: i < sales.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
            alignItems: "center",
          }}>
            <div style={{ color: TEAL, fontWeight: 700, fontSize: 13 }}>#{s.billNumber}</div>
            <div>
              <div style={{ color: "#fff", fontSize: 13 }}>{s.staffName}</div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>{s.staffUsername}</div>
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>{fmt(s.createdAt)}</div>
            <div>
              <span style={{
                background: `${PM_COLOR[s.paymentMethod] ?? "#aaa"}20`,
                color: PM_COLOR[s.paymentMethod] ?? "#aaa",
                border: `1px solid ${PM_COLOR[s.paymentMethod] ?? "#aaa"}40`,
                borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600,
              }}>
                {s.paymentMethod?.toUpperCase()}
              </span>
            </div>
            <div>
              <span style={{
                background: `${STATUS_COLOR[s.status] ?? "#aaa"}20`,
                color: STATUS_COLOR[s.status] ?? "#aaa",
                border: `1px solid ${STATUS_COLOR[s.status] ?? "#aaa"}40`,
                borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600,
              }}>
                {s.status?.toUpperCase()}
              </span>
            </div>
            <div style={{ textAlign: "right", color: "#fff", fontWeight: 600, fontSize: 13 }}>
              {fmtMoney(s.netPay)}
              {s.discount > 0 && (
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>-{fmtMoney(s.discount)} disc</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
          <button
            disabled={page <= 1}
            onClick={() => load(page - 1)}
            style={{
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8, color: page <= 1 ? "rgba(255,255,255,0.2)" : "#fff",
              padding: "8px 16px", cursor: page <= 1 ? "default" : "pointer", fontSize: 13,
            }}
          >
            ← Prev
          </button>
          <div style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, color: "rgba(255,255,255,0.5)", padding: "8px 16px", fontSize: 13,
          }}>
            Page {page} of {totalPages}
          </div>
          <button
            disabled={page >= totalPages}
            onClick={() => load(page + 1)}
            style={{
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8, color: page >= totalPages ? "rgba(255,255,255,0.2)" : "#fff",
              padding: "8px 16px", cursor: page >= totalPages ? "default" : "pointer", fontSize: 13,
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
