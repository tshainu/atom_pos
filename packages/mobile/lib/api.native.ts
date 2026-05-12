import { hc } from "hono/client";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const rawUrl =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  "https://58c4ipm2bu9el237kqimq-preview-4200.runable.site";

const baseUrl = rawUrl.replace(/\/$/, "");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = hc<any>(baseUrl);
export const api = client.api;

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem("token");
  const url = `${baseUrl}/api/${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  return res.json();
}
