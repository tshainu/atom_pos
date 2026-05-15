import { useState, useRef } from "react";
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
  Animated,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { saveSession } from "../lib/auth";
import { apiFetch } from "../lib/api";

const { width: SW, height: SH } = Dimensions.get("window");
const TEAL = "#2BBFB3";
const HEADER_H = SH * 0.28;

const splashBg = require("../assets/splash-bg.jpg");

// Floating label input component
function FloatingInput({
  label,
  value,
  onChangeText,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: any;
  keyboardType?: any;
}) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const [focused, setFocused] = useState(false);

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(anim, { toValue: 1, duration: 160, useNativeDriver: false }).start();
  };
  const handleBlur = () => {
    setFocused(false);
    if (!value) {
      Animated.timing(anim, { toValue: 0, duration: 160, useNativeDriver: false }).start();
    }
  };

  const labelTop = anim.interpolate({ inputRange: [0, 1], outputRange: [12, -8] });
  const labelSize = anim.interpolate({ inputRange: [0, 1], outputRange: [14, 11] });
  const labelColor = anim.interpolate({ inputRange: [0, 1], outputRange: ["#aaa", TEAL] });
  const borderColor = focused ? TEAL : "#ddd";

  return (
    <View style={[floatStyles.wrapper, { borderColor }]}>
      <Animated.Text style={[floatStyles.label, { top: labelTop, fontSize: labelSize, color: labelColor }]}>
        {label}
      </Animated.Text>
      <TextInput
        style={floatStyles.input}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? "none"}
        autoCorrect={false}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const floatStyles = StyleSheet.create({
  wrapper: {
    borderWidth: 1.5,
    borderRadius: 10,
    height: 48,
    marginBottom: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
    backgroundColor: "#fff",
    position: "relative",
  },
  label: {
    position: "absolute",
    left: 14,
    backgroundColor: "#fff",
    paddingHorizontal: 3,
    zIndex: 1,
  },
  input: {
    fontSize: 14,
    color: "#222",
    paddingTop: 6,
    paddingBottom: 0,
  },
});

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

      {/* ── HEADER ── */}
      <View style={[styles.header, { height: HEADER_H + insets.top }]}>
        <Image source={splashBg} style={styles.headerBg} resizeMode="cover" />
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
          <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
            <Text style={styles.signIn}>Sign in !</Text>

            <FloatingInput
              label="Shop ID"
              value={shopId}
              onChangeText={v => setShopId(v.toUpperCase())}
              autoCapitalize="characters"
            />
            <FloatingInput
              label="Username"
              value={username}
              onChangeText={setUsername}
            />
            <FloatingInput
              label="Password"
              value={password}
              onChangeText={setPassword}
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
  wave: {
    position: "absolute",
    bottom: -30,
    left: -SW * 0.1,
    width: SW * 1.2,
    height: 60,
    backgroundColor: "#fff",
    borderRadius: 50,
  },

  body: {
    paddingHorizontal: 28,
    paddingTop: 10,
    backgroundColor: "#fff",
  },
  signIn: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 18,
    marginTop: 4,
  },
  loginBtn: {
    backgroundColor: "#1B5E20",
    borderRadius: 50,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 14,
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 17,
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
