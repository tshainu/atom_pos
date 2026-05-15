import { useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { saveSession } from "../lib/auth";
import { apiFetch } from "../lib/api";

const { width: SW, height: SH } = Dimensions.get("window");
const TEAL = "#2BBFB3";
const HEADER_H = SH * 0.28;

const splashBg = require("../assets/splash-bg.jpg");

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [shopId, setShopId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!shopId.trim() || !username.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch("auth/login", {
        method: "POST",
        body: JSON.stringify({ shopId: shopId.trim(), username: username.trim(), password }),
      });
      if (data.error) {
        Alert.alert("Login Failed", data.error);
        return;
      }
      await saveSession(data.token, data.user);
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={TEAL} translucent />

      {/* ── HEADER: splash bg + atom logo ── */}
      <View style={[styles.header, { height: HEADER_H + insets.top }]}>
        <Image source={splashBg} style={styles.headerBg} resizeMode="cover" />
        {/* bottom white wave */}
        <View style={styles.wave} />
      </View>

      {/* ── FORM ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
            <Text style={styles.signIn}>Sign in !</Text>

            <Text style={styles.label}>Shop ID</Text>
            <TextInput
              style={styles.input}
              value={shopId}
              onChangeText={setShopId}
              placeholderTextColor="#bbb"
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <Text style={styles.label}>User name</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholderTextColor="#bbb"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholderTextColor="#bbb"
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.loginBtn, loading && { opacity: 0.75 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginBtnText}>Login</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotWrap} activeOpacity={0.7}>
              <Text style={styles.forgotText}>Forgot shop ID or Password</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },

  // ── header ──
  header: {
    width: SW,
    overflow: "hidden",
    backgroundColor: TEAL,
  },
  headerBg: {
    position: "absolute",
    top: 0, left: 0,
    width: SW,
    height: HEADER_H + 100,
  },
  // white rounded bottom edge
  wave: {
    position: "absolute",
    bottom: -30,
    left: -SW * 0.1,
    width: SW * 1.2,
    height: 60,
    backgroundColor: "#fff",
    borderRadius: 50,
  },

  // ── body ──
  body: {
    paddingHorizontal: 32,
    paddingTop: 24,
    backgroundColor: "#fff",
  },
  signIn: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 22,
  },
  label: {
    fontSize: 13,
    color: "#555",
    marginBottom: 6,
    marginTop: 2,
  },
  input: {
    borderWidth: 1.5,
    borderColor: TEAL,
    borderRadius: 50,
    height: 48,
    paddingHorizontal: 18,
    fontSize: 15,
    color: "#222",
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  loginBtn: {
    backgroundColor: "#1B5E20",
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 18,
    marginHorizontal: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  forgotWrap: {
    alignItems: "center",
    paddingVertical: 4,
  },
  forgotText: {
    color: "#666",
    fontSize: 13,
  },
});
