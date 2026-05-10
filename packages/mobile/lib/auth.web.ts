export interface AuthUser {
  id: number;
  fullName: string;
  username: string;
  role: string;
  shopId: number;
  shopName: string;
}

const DEMO_USER: AuthUser = {
  id: 1,
  fullName: "Admin User",
  username: "admin",
  role: "admin",
  shopId: 1,
  shopName: "ATOM Garments",
};

export async function getToken(): Promise<string | null> {
  return localStorage.getItem("token");
}

export async function getUser(): Promise<AuthUser | null> {
  const raw = localStorage.getItem("user");
  if (!raw) return DEMO_USER;
  try { return JSON.parse(raw); } catch { return DEMO_USER; }
}

export async function saveSession(token: string, user: AuthUser) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export async function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
