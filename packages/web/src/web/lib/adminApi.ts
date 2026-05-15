const BASE = "/api";

function adminHeaders() {
  const token = localStorage.getItem("admin_token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function adminLogin(username: string, password: string) {
  const res = await fetch(`${BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data.token as string;
}

export async function adminGetDashboard() {
  const res = await fetch(`${BASE}/admin/dashboard`, { headers: adminHeaders() });
  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
}

export async function adminGetShops() {
  const res = await fetch(`${BASE}/admin/shops`, { headers: adminHeaders() });
  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
}

export async function adminSuspendShop(id: number, suspended: boolean) {
  const res = await fetch(`${BASE}/admin/shops/${id}/suspend`, {
    method: "PUT", headers: adminHeaders(), body: JSON.stringify({ suspended }),
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export async function adminUpdateShop(id: number, data: Record<string, any>) {
  const res = await fetch(`${BASE}/admin/shops/${id}`, {
    method: "PUT", headers: adminHeaders(), body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export async function adminUpdateShopPassword(id: number, password: string) {
  const res = await fetch(`${BASE}/admin/shops/${id}/password`, {
    method: "PUT", headers: adminHeaders(), body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export async function adminCreateShop(data: {
  shopId: string; name: string; address?: string; phone?: string;
  ownerName?: string; ownerContact?: string; adminPassword?: string;
}) {
  const res = await fetch(`${BASE}/admin/shops`, {
    method: "POST", headers: adminHeaders(), body: JSON.stringify(data),
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
  return res.json();
}

export async function adminGetUsers(shopId?: number) {
  const url = shopId ? `${BASE}/admin/users?shopId=${shopId}` : `${BASE}/admin/users`;
  const res = await fetch(url, { headers: adminHeaders() });
  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
}

export async function adminSuspendUser(id: number, suspended: boolean) {
  const res = await fetch(`${BASE}/admin/users/${id}/suspend`, {
    method: "PUT", headers: adminHeaders(), body: JSON.stringify({ suspended }),
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export async function adminCreateUser(data: {
  shopId: number; username: string; password: string; fullName: string; role?: string; phone?: string;
}) {
  const res = await fetch(`${BASE}/admin/users`, {
    method: "POST", headers: adminHeaders(), body: JSON.stringify(data),
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
  return res.json();
}

export async function adminResetUserPassword(id: number, password: string) {
  const res = await fetch(`${BASE}/admin/users/${id}/reset-password`, {
    method: "PUT", headers: adminHeaders(), body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export async function adminGetTransactions(shopId: number, page = 1, from?: string, to?: string) {
  let url = `${BASE}/admin/shops/${shopId}/transactions?page=${page}`;
  if (from) url += `&from=${from}`;
  if (to) url += `&to=${to}`;
  const res = await fetch(url, { headers: adminHeaders() });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export async function adminGetActivityLog(shopId?: number, page = 1) {
  let url = `${BASE}/admin/activity-log?page=${page}`;
  if (shopId) url += `&shopId=${shopId}`;
  const res = await fetch(url, { headers: adminHeaders() });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export async function adminGetAnnouncements() {
  const res = await fetch(`${BASE}/admin/announcements`, { headers: adminHeaders() });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export async function adminCreateAnnouncement(data: {
  title: string; body: string; priority?: string;
  targetShopId?: number | null; expiresAt?: string | null;
}) {
  const res = await fetch(`${BASE}/admin/announcements`, {
    method: "POST", headers: adminHeaders(), body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export async function adminUpdateAnnouncement(id: number, data: Partial<{
  title: string; body: string; priority: string;
  targetShopId: number | null; isActive: boolean; expiresAt: string | null;
}>) {
  const res = await fetch(`${BASE}/admin/announcements/${id}`, {
    method: "PUT", headers: adminHeaders(), body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export async function adminDeleteAnnouncement(id: number) {
  const res = await fetch(`${BASE}/admin/announcements/${id}`, {
    method: "DELETE", headers: adminHeaders(),
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export function isAdminLoggedIn() {
  return !!localStorage.getItem("admin_token");
}

export function adminLogout() {
  localStorage.removeItem("admin_token");
}
