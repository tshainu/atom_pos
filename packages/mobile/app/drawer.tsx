import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getUser, clearSession } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { colors, spacing, radius } from "../lib/theme";

interface MenuItem {
  icon: string;
  label: string;
  onPress: () => void;
  sub?: boolean;
}

export default function DrawerScreen() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  const logout = () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try { await apiFetch("auth/logout", { method: "POST" }); } catch {}
          await clearSession();
          router.replace("/login");
        },
      },
    ]);
  };

  const isAdmin = user?.role === "admin";

  const sections: { title: string; items: MenuItem[] }[] = [
    ...(isAdmin ? [{
      title: "Management",
      items: [
        { icon: "people-outline", label: "Users & Roles", onPress: () => router.push("/staff") },
        { icon: "list-outline", label: "Items — List", onPress: () => router.push("/items"), sub: true },
        { icon: "add-circle-outline", label: "Items — Add New", onPress: () => router.push("/items/add"), sub: true },
        { icon: "person-add-outline", label: "Staff — Add New", onPress: () => router.push("/staff/add"), sub: true },
      ],
    }] : []),
    {
      title: "Sales",
      items: [
        { icon: "cart-outline", label: "POS — New Bill", onPress: () => router.push("/(tabs)/pos") },
        { icon: "document-text-outline", label: "My Sales", onPress: () => router.push("/(tabs)/reports") },
        { icon: "trending-up-outline", label: "My Commission", onPress: () => router.push("/(tabs)/reports") },
      ],
    },
    {
      title: "Reports",
      items: [
        { icon: "bar-chart-outline", label: "Sales Report", onPress: () => router.push("/(tabs)/reports") },
        { icon: "stats-chart-outline", label: "Staff Commission", onPress: () => router.push("/(tabs)/reports") },
      ],
    },
    {
      title: "Account",
      items: [
        { icon: "settings-outline", label: "Settings", onPress: () => Alert.alert("Settings", "Coming soon") },
        { icon: "log-out-outline", label: "Logout", onPress: logout },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.fullName?.[0] ?? "U"}</Text>
          </View>
          <View>
            <Text style={styles.greeting}>Hello, {user?.fullName?.split(" ")[0] ?? "User"}!</Text>
            <Text style={styles.role}>{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ""}</Text>
            <Text style={styles.shopName}>{user?.shopName ?? ""}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuItem, item.sub && styles.menuItemSub]}
                onPress={() => { router.back(); setTimeout(item.onPress, 200); }}
              >
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={item.label === "Logout" ? colors.danger : colors.primary}
                />
                <Text style={[styles.menuLabel, item.label === "Logout" && { color: colors.danger }]}>
                  {item.label}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.border} />
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* App version */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>ATOM POS v1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.primary,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  closeBtn: { marginBottom: 16 },
  userInfo: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 24, fontWeight: "700", color: "#fff" },
  greeting: { fontSize: 18, fontWeight: "700", color: "#fff" },
  role: { fontSize: 13, color: "rgba(255,255,255,0.8)", textTransform: "capitalize" },
  shopName: { fontSize: 12, color: "rgba(255,255,255,0.65)" },
  scroll: { flex: 1 },
  section: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  sectionTitle: {
    fontSize: 11, fontWeight: "700", color: colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6,
  },
  menuItem: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.white, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    marginBottom: 6, gap: 12,
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  menuItemSub: { marginLeft: 12 },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  footer: { padding: spacing.md, alignItems: "center" },
  footerText: { fontSize: 12, color: colors.textSecondary },
});
