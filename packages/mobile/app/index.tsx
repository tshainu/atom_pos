import { useEffect } from "react";
import { View, Text, StyleSheet, Image, Dimensions } from "react-native";
import { router } from "expo-router";
import { getToken, saveSession } from "../lib/auth";
import { apiFetch } from "../lib/api";

const { width: SW, height: SH } = Dimensions.get("window");

export default function SplashScreen() {
  useEffect(() => {
    const check = async () => {
      await new Promise((r) => setTimeout(r, 2000));
      const existing = await getToken();
      if (existing) {
        router.replace("/(tabs)");
        return;
      }
      // Auto-login for demo
      try {
        const data = await apiFetch("auth/login", {
          method: "POST",
          body: JSON.stringify({ shopId: "SHOP001", username: "admin", password: "admin123" }),
        });
        if (data.token) {
          await saveSession(data.token, data.user);
        }
      } catch (_) {}
      router.replace("/(tabs)");
    };
    check();
  }, []);

  return (
    <View style={styles.root}>
      <Image
        source={require("../assets/splash-bg.jpg")}
        style={styles.bg}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bg: {
    width: SW,
    height: SH,
    position: "absolute",
    top: 0,
    left: 0,
  },
});
