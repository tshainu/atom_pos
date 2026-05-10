import { useEffect } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { router } from "expo-router";
import { getToken, getUser } from "../lib/auth";
import { colors } from "../lib/theme";

export default function SplashScreen() {
  useEffect(() => {
    const check = async () => {
      await new Promise((r) => setTimeout(r, 1200));
      // Auto-login for demo
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shopId: "SHOP001", username: "admin", password: "admin123" }),
        });
        const data = await res.json();
        if (data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      } catch (_) {}
      router.replace("/(tabs)");
    };
    check();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <Text style={styles.atomText}>ATOM</Text>
        <Text style={styles.posText}>POS</Text>
      </View>
      <Text style={styles.tagline}>Mobile Point of Sale</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBox: {
    alignItems: "center",
    marginBottom: 12,
  },
  atomText: {
    fontSize: 56,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 8,
  },
  posText: {
    fontSize: 24,
    fontWeight: "300",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 12,
    marginTop: -8,
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 2,
    marginTop: 16,
  },
});
