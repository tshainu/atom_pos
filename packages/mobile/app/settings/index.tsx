import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getUser } from "../../lib/auth";
import { colors, spacing, radius } from "../../lib/theme";

export default function SettingsScreen() {
  const [user, setUser] = useState<any>(null);

  useFocusEffect(useCallback(() => {
    getUser().then(setUser);
  }, []));

  const isAdmin = user?.role === "admin";

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: roleColor(user?.role) + "20" }]}>
            <Text style={[styles.avatarText, { color: roleColor(user?.role) }]}>
              {user?.fullName?.[0] ?? "U"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.fullName ?? ""}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.roleBadge, { backgroundColor: roleColor(user?.role) + "20" }]}>
                <Text style={[styles.roleText, { color: roleColor(user?.role) }]}>
                  {capitalize(user?.role ?? "")}
                </Text>
              </View>
              <Text style={styles.shopText}>{user?.shopName ?? ""}</Text>
              {user?.shopCode ? (
                <View style={styles.shopCodePill}>
                  <Text style={styles.shopCodeText}>{user.shopCode}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* POS Settings — always visible */}
        <Text style={styles.sectionTitle}>POS Settings</Text>
        <View style={styles.card}>
          <SettingRow
            icon="print-outline"
            iconBg="#E0F2FE"
            iconColor="#0891B2"
            label="Printer Settings"
            subtitle="Receipt printer · paper width · header"
            onPress={() => router.push("/settings/printer")}
          />
          <Divider />
          <SettingRow
            icon="cash-outline"
            iconBg="#DCFCE7"
            iconColor="#16a34a"
            label="Credit Collection"
            subtitle="Collect payments on credit bills"
            onPress={() => router.push("/settings/credit-collection")}
          />
          <Divider />
          <SettingRow
            icon="logo-whatsapp"
            iconBg="#DCFCE7"
            iconColor="#25D366"
            label="WhatsApp Settings"
            subtitle="Send bills via WhatsApp"
            onPress={() => router.push("/settings/whatsapp")}
          />
        </View>

        {/* Admin-only */}
        {isAdmin && (
          <>
            <Text style={styles.sectionTitle}>Shop Management</Text>
            <View style={styles.card}>
              <SettingRow
                icon="business-outline"
                iconBg="#FFF7ED"
                iconColor="#EA580C"
                label="Business Information"
                subtitle="Shop name, address & contact"
                onPress={() => router.push("/settings/business")}
              />
              <Divider />
              <SettingRow
                icon="people-outline"
                iconBg="#F5F3FF"
                iconColor="#7C3AED"
                label="User Management"
                subtitle="Staff accounts, roles & permissions"
                onPress={() => router.push("/users")}
              />
              <Divider />
              <SettingRow
                icon="shirt-outline"
                iconBg={colors.primaryLight}
                iconColor={colors.primary}
                label="Items Management"
                subtitle="Products, prices & categories"
                onPress={() => router.push("/items")}
              />
              <Divider />
              <SettingRow
                icon="person-add-outline"
                iconBg={colors.primaryLight}
                iconColor={colors.primary}
                label="Add New Staff"
                subtitle="Create a new staff account"
                onPress={() => router.push("/staff/add")}
              />
            </View>
          </>
        )}

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <SettingRow
            icon="storefront-outline"
            iconBg="#FFF7ED"
            iconColor="#EA580C"
            label={user?.shopName ?? "Shop"}
            subtitle={user?.shopCode ? `Shop ID: ${user.shopCode}` : ""}
          />
          <Divider />
          <SettingRow
            icon="information-circle-outline"
            iconBg={colors.bg}
            iconColor={colors.textSecondary}
            label="App Version"
            subtitle="ATOM POS v1.0.0"
          />
        </View>

        {/* Support */}
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.card}>
          <View style={styles.supportBlock}>
            <Text style={styles.supportDev}>Developed by AxisXNOR (PVT) Ltd</Text>
            <Text style={styles.supportSubLabel}>Contact for support</Text>
            <Text style={styles.supportContact}>atompos@axisxnor.com</Text>
            <Text style={styles.supportContact}>+94711336666</Text>
            <Text style={styles.supportContact}>+94761619596</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  icon, iconBg, iconColor, label, subtitle, onPress,
}: {
  icon: string; iconBg: string; iconColor: string;
  label: string; subtitle?: string; onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.65 : 1}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors.border} />}
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

function roleColor(role?: string) {
  if (role === "admin") return "#7C3AED";
  if (role === "cashier") return "#0891B2";
  return "#059669";
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 40 },
  profileCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.white, borderRadius: radius.lg,
    padding: spacing.md, gap: 14, marginBottom: 24,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 22, fontWeight: "700" },
  profileName: { fontSize: 16, fontWeight: "700", color: colors.textPrimary, marginBottom: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  roleText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  shopText: { fontSize: 12, color: colors.textSecondary },
  shopCodePill: { backgroundColor: "#E0F2FE", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  shopCodeText: { fontSize: 11, fontWeight: "700", color: "#0891B2" },
  sectionTitle: {
    fontSize: 11, fontWeight: "700", color: colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 1.2,
    marginBottom: 8, marginTop: 4,
  },
  card: {
    backgroundColor: colors.white, borderRadius: radius.lg, marginBottom: 20,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: 14, gap: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 62 },
  supportBlock: { padding: spacing.md, gap: 4 },
  supportDev: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginBottom: 6 },
  supportSubLabel: { fontSize: 11, fontWeight: "600", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  supportContact: { fontSize: 13, color: colors.primary, marginBottom: 2 },
});
