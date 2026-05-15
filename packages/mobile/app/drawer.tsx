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
  badge?: string;
  badgeColor?: string;
  danger?: boolean;
}

const ROLE_COLOR: Record<string, string> = {
  admin: "#7C3AED",
  cashier: "#0891B2",
  salesperson: "#059669",
};

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
  const isCashier = user?.role === "cashier" || isAdmin;
  const roleColor = ROLE_COLOR[user?.role] ?? colors.primary;

  const sections: { title: string; items: MenuItem[] }[] = [
    // ── POS (all roles) ──────────────────────────────────────────
    {
      title: "Point of Sale",
      items: [
        { icon: "cart-outline", label: "New Bill", onPress: () => router.push("/(tabs)/pos") },
        { icon: "document-text-outline", label: "My Sales", onPress: () => router.push("/(tabs)/reports") },
        { icon: "trending-up-outline", label: "My Commission", onPress: () => router.push("/(tabs)/reports") },
      ],
    },

    // ── Admin-only Management ────────────────────────────────────
    ...(isAdmin ? [{
      title: "Management",
      items: [
        {
          icon: "people-outline",
          label: "User Management",
          onPress: () => router.push("/users"),
          badge: "Admin",
          badgeColor: "#7C3AED",
        },
        {
          icon: "shirt-outline",
          label: "Items — List",
          onPress: () => router.push("/items"),
          sub: true,
        },
        {
          icon: "add-circle-outline",
          label: "Items — Add New",
          onPress: () => router.push("/items/add"),
          sub: true,
        },
        {
          icon: "person-add-outline",
          label: "Staff — Add New",
          onPress: () => router.push("/staff/add"),
          sub: true,
        },
        {
          icon: "bar-chart-outline",
          label: "Reports",
          onPress: () => router.push("/(tabs)/reports"),
          sub: true,
        },
      ],
    }] : []),

    // ── Cashier-only shortcuts ──────────────────────────────────
    ...(!isAdmin && isCashier ? [{
      title: "Quick Access",
      items: [
        { icon: "list-outline", label: "Browse Items", onPress: () => router.push("/items") },
      ],
    }] : []),

    // ── Account (all roles) ──────────────────────────────────────
    {
      title: "Account",
      items: [
        { icon: "settings-outline", label: "Settings", onPress: () => router.push("/settings") },
        { icon: "print-outline", label: "Printer Settings", onPress: () => router.push("/settings/printer"), sub: true },
        { icon: "log-out-outline", label: "Logout", onPress: logout, danger: true },
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
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Hello, {user?.fullName?.split(" ")[0] ?? "User"}!</Text>
            <View style={styles.roleRow}>
              <View style={[styles.rolePill, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <Text style={styles.rolePillText}>{capitalize(user?.role ?? "")}</Text>
              </View>
            </View>
            <View style={styles.shopRow}>
              <Text style={styles.shopName}>{user?.shopName ?? ""}</Text>
              {user?.shopCode ? (
                <View style={styles.shopCodePill}>
                  <Text style={styles.shopCodeText}>{user.shopCode}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuItem, item.sub && styles.menuItemSub]}
                onPress={() => { router.back(); setTimeout(item.onPress, 200); }}
              >
                <View style={[
                  styles.iconWrap,
                  { backgroundColor: item.danger ? "#FEE2E2" : item.badgeColor ? item.badgeColor + "15" : colors.primaryLight }
                ]}>
                  <Ionicons
                    name={item.icon as any}
                    size={18}
                    color={item.danger ? colors.danger : item.badgeColor ?? colors.primary}
                  />
                </View>
                <Text style={[styles.menuLabel, item.danger && { color: colors.danger }]}>
                  {item.label}
                </Text>
                {item.badge ? (
                  <View style={[styles.badge, { backgroundColor: (item.badgeColor ?? colors.primary) + "18" }]}>
                    <Text style={[styles.badgeText, { color: item.badgeColor ?? colors.primary }]}>{item.badge}</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={14} color={colors.border} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* App version */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>ATOM POS v1.0.0  •  {capitalize(user?.role ?? "")}</Text>
      </View>
    </SafeAreaView>
  );
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
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
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 24, fontWeight: "700", color: "#fff" },
  greeting: { fontSize: 18, fontWeight: "700", color: "#fff" },
  roleRow: { flexDirection: "row", marginTop: 4, marginBottom: 4 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  rolePillText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  shopRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  shopName: { fontSize: 12, color: "rgba(255,255,255,0.65)" },
  shopCodePill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 7, paddingVertical: 1,
    borderRadius: 6,
  },
  shopCodeText: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.9)" },
  scroll: { flex: 1 },
  section: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  sectionTitle: {
    fontSize: 10, fontWeight: "700", color: colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 6,
  },
  menuItem: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.white, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    marginBottom: 5, gap: 10,
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  menuItemSub: { marginLeft: 14, backgroundColor: "#FAFAFA" },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  footer: { padding: spacing.md, alignItems: "center" },
  footerText: { fontSize: 11, color: colors.textSecondary },
});
