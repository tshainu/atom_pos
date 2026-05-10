import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { saveSession } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { colors, spacing, radius } from "../lib/theme";

export default function LoginScreen() {
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
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerAtom}>ATOM</Text>
        <Text style={styles.headerPos}>POS</Text>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSub}>Enter your credentials to continue</Text>

            <Text style={styles.label}>Shop ID</Text>
            <TextInput
              style={styles.input}
              value={shopId}
              onChangeText={setShopId}
              placeholder="e.g. SHOP001"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.btn, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: {
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.primary,
  },
  headerAtom: {
    fontSize: 42,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 6,
  },
  headerPos: {
    fontSize: 18,
    fontWeight: "300",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 10,
    marginTop: -6,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "flex-start",
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    backgroundColor: "#FAFAFA",
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
