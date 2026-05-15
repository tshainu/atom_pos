import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { isAdminLoggedIn, adminLogout } from "../../lib/adminApi";
import Dashboard from "./dashboard";
import Shops from "./shops";
import Users from "./users";
import Transactions from "./transactions";
import ActivityLog from "./activity-log";
import Announcements from "./announcements";

const TEAL = "#2BBFB3";

type Tab = "dashboard" | "shops" | "users" | "transactions" | "activity-log" | "announcements";

const NAV: { key: Tab; label: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "shops", label: "Shops", icon: "🏪" },
  { key: "users", label: "Staff", icon: "👥" },
  { key: "transactions", label: "Transactions", icon: "💳" },
  { key: "activity-log", label: "Activity Log", icon: "🕐" },
  { key: "announcements", label: "Announcements", icon: "📢" },
];

export default function AdminPanel() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      navigate(import.meta.env.VITE_ADMIN_STANDALONE === "true" ? "/login" : "/admin/login");
    }
  }, []);

  function handleLogout() {
    adminLogout();
    navigate(import.meta.env.VITE_ADMIN_STANDALONE === "true" ? "/login" : "/admin/login");
  }

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      background: "#0d0d1a",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? 220 : 64,
        background: "rgba(255,255,255,0.03)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s",
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          padding: sidebarOpen ? "22px 20px" : "22px 16px",
          display: "flex", alignItems: "center", gap: 10,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}>
          <div style={{
            width: 34, height: 34, flexShrink: 0,
            background: `linear-gradient(135deg, ${TEAL}, #1a9e94)`,
            borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>⚡</div>
          {sidebarOpen && (
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, lineHeight: 1 }}>ATOM</div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginTop: 2 }}>Admin Portal</div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(p => !p)}
            style={{
              marginLeft: "auto", background: "none", border: "none",
              color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 16, padding: 0,
            }}
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {NAV.map(item => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: sidebarOpen ? "10px 12px" : "10px",
                background: tab === item.key ? `rgba(43,191,179,0.12)` : "transparent",
                border: tab === item.key ? `1px solid rgba(43,191,179,0.25)` : "1px solid transparent",
                borderRadius: 8, cursor: "pointer",
                color: tab === item.key ? TEAL : "rgba(255,255,255,0.5)",
                fontSize: 14, fontWeight: tab === item.key ? 600 : 400,
                transition: "all 0.15s",
                marginBottom: 4,
                justifyContent: sidebarOpen ? "flex-start" : "center",
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && item.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: sidebarOpen ? "10px 12px" : "10px",
              background: "transparent", border: "1px solid transparent",
              borderRadius: 8, cursor: "pointer",
              color: "rgba(255,100,100,0.7)",
              fontSize: 14, transition: "all 0.15s",
              justifyContent: sidebarOpen ? "flex-start" : "center",
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>🚪</span>
            {sidebarOpen && "Logout"}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {/* Top bar */}
        <div style={{
          padding: "16px 28px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
            {NAV.find(n => n.key === tab)?.icon} {NAV.find(n => n.key === tab)?.label}
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(43,191,179,0.1)", border: "1px solid rgba(43,191,179,0.2)",
            borderRadius: 20, padding: "4px 12px",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: TEAL }} />
            <span style={{ color: TEAL, fontSize: 12, fontWeight: 600 }}>Super Admin</span>
          </div>
        </div>

        {/* Page content */}
        <div style={{ padding: "28px 28px" }}>
          {tab === "dashboard" && <Dashboard />}
          {tab === "shops" && <Shops />}
          {tab === "users" && <Users />}
          {tab === "transactions" && <Transactions />}
          {tab === "activity-log" && <ActivityLog />}
          {tab === "announcements" && <Announcements />}
        </div>
      </div>
    </div>
  );
}
