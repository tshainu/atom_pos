import { useEffect, useState } from "react";
import { adminGetDashboard } from "../../lib/adminApi";

const TEAL = "#2BBFB3";

function fmt(n: number) {
  return (n ?? 0).toLocaleString("en-LK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function KpiCard({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color?: string; icon?: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14, padding: "20px 22px", flex: 1, minWidth: 160,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      </div>
      <p style={{ color: color || "#fff", fontSize: 28, fontWeight: 700, margin: 0 }}>{value}</p>
      {sub && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetDashboard().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "rgba(255,255,255,0.4)" }}>
      Loading dashboard...
    </div>
  );
  if (!data) return <div style={{ color: "#ff8080" }}>Failed to load dashboard</div>;

  const maxRevenue = Math.max(...(data.dailyChart || []).map((d: any) => d.revenue), 1);
  const maxShops = Math.max(...(data.monthlyShops || []).map((d: any) => d.count), 1);

  return (
    <div>
      <h2 style={{ color: "#fff", margin: "0 0 24px", fontSize: 22, fontWeight: 700 }}>Dashboard</h2>

      {/* Shop KPIs */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
        <KpiCard label="Total Shops" value={fmt(data.totalShops)} color={TEAL} icon="🏪" />
        <KpiCard label="Active Shops" value={fmt(data.activeShops)} sub={`${data.totalShops - data.activeShops} suspended`} color="#4ade80" icon="✅" />
        <KpiCard label="Now Logged In" value={fmt(data.loggedIn)} sub="active sessions" color="#f59e0b" icon="🟢" />
      </div>

      {/* Monthly new shops chart */}
      <div style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14, padding: "20px 22px", marginBottom: 20,
      }}>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Newly Activated Shops — Monthly
        </p>
        {(!data.monthlyShops || data.monthlyShops.length === 0) ? (
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No shop data yet</p>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 130 }}>
            {data.monthlyShops.map((d: any) => {
              const h = Math.max(8, (d.count / maxShops) * 110);
              const label = d.month?.slice(0, 7) ?? "";
              return (
                <div key={d.month} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 28 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginBottom: 4 }}>{d.count}</span>
                  <div title={`${label}: ${d.count} shops`} style={{
                    width: "100%", height: h,
                    background: `linear-gradient(to top, ${TEAL}, rgba(43,191,179,0.4))`,
                    borderRadius: "4px 4px 0 0", cursor: "default",
                  }} />
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, marginTop: 4, textAlign: "center" }}>
                    {label.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>


    </div>
  );
}
