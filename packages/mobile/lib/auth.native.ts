import AsyncStorage from "@react-native-async-storage/async-storage";

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
  return AsyncStorage.getItem("token");
}

export async function getUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem("user");
  if (!raw) return DEMO_USER;
  try { return JSON.parse(raw); } catch { return DEMO_USER; }
}

export async function saveSession(token: string, user: AuthUser) {
  await AsyncStorage.setItem("token", token);
  await AsyncStorage.setItem("user", JSON.stringify(user));
}

export async function clearSession() {
  await AsyncStorage.removeItem("token");
  await AsyncStorage.removeItem("user");
}
