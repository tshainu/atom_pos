import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AuthUser {
  id: number;
  fullName: string;
  username: string;
  role: string;
  shopId: number;
  shopName: string;
  shopCode?: string;
  shopAddress?: string;
  shopPhone?: string;
}

const DEMO_USER: AuthUser = {
  id: 1,
  fullName: "Admin User",
  username: "admin",
  role: "admin",
  shopId: 1,
  shopName: "ATOM Garments",
};

// In-memory user cache — avoids AsyncStorage round-trip on every screen mount
let _cachedUser: AuthUser | null | undefined = undefined;

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem("token");
}

export async function getUser(): Promise<AuthUser | null> {
  // Return from memory if already loaded
  if (_cachedUser !== undefined) return _cachedUser;

  const raw = await AsyncStorage.getItem("user");
  if (!raw) {
    _cachedUser = DEMO_USER;
    return DEMO_USER;
  }
  try {
    _cachedUser = JSON.parse(raw);
    return _cachedUser!;
  } catch {
    _cachedUser = DEMO_USER;
    return DEMO_USER;
  }
}

export async function saveSession(token: string, user: AuthUser) {
  _cachedUser = user; // update memory cache immediately
  await AsyncStorage.setItem("token", token);
  await AsyncStorage.setItem("user", JSON.stringify(user));
}

export async function clearSession() {
  _cachedUser = undefined; // reset memory cache
  await AsyncStorage.removeItem("token");
  await AsyncStorage.removeItem("user");
}
