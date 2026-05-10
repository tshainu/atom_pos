import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { getUser } from "../../lib/auth";
import { apiFetch } from "../../lib/api";
import { colors, spacing, radius } from "../../lib/theme";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

interface StaffSale {
  userId: number;
  name: string;
  total: number;
  count: number;
}

interface Summary {
  totalSales: number;
  totalItems: number;
  totalBills: number;
  staffSales: StaffSale[];
}

export default function DashboardScreen() {
  const [user, setUser] = useState<any>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"sales" | "staff">("sales");

  const load = async () => {
    const u = await getUser();
    setUser(u);
    if (u) {
      const data = await apiFetch(`reports/summary?shopId=${u.shopId}`);
      if (!data.error) setSummary(data);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const maxStaff = summary?.staffSales.reduce((m, s) => Math.max(m, s.total), 1) ?? 1;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Summary Cards */}
        <View style={styles.cardsRow}>
          <View style={[styles.card, styles.cardPrimary]}>
            <Text style={styles.cardLabel}>Total Sales</Text>
            <Text style={styles.cardValue}>Rs.{(summary?.totalSales ?? 0).toLocaleString()}</Text>
            <Text style={styles.cardSub}>{summary?.totalBills ?? 0} bills</Text>
          </View>
          <View style={[styles.card, styles.cardGreen]}>
            <Text style={styles.cardLabel}>Items Sold</Text>
            <Text style={styles.cardValue}>{summary?.totalItems ?? 0}</Text>
            <Text style={styles.cardSub}>units</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "sales" && styles.tabActive]}
            onPress={() => setActiveTab("sales")}
          >
            <Text style={[styles.tabText, activeTab === "sales" && styles.tabTextActive]}>
              Product Sales
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "staff" && styles.tabActive]}
            onPress={() => setActiveTab("staff")}
          >
            <Text style={[styles.tabText, activeTab === "staff" && styles.tabTextActive]}>
              Staff & Sales
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "sales" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sales by Staff</Text>
            {(summary?.staffSales ?? []).length === 0 ? (
              <Text style={styles.emptyText}>No sales data yet</Text>
            ) : (
              summary?.staffSales.map((s) => (
                <View key={s.userId} style={styles.barRow}>
                  <Text style={styles.barLabel}>{s.name}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${Math.round((s.total / maxStaff) * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.barValue}>Rs.{s.total.toLocaleString()}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "staff" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Staff Breakdown</Text>
            {(summary?.staffSales ?? []).length === 0 ? (
              <Text style={styles.emptyText}>No data yet</Text>
            ) : (
              summary?.staffSales.map((s, i) => (
                <View key={s.userId} style={styles.staffRow}>
                  <View style={styles.staffAvatar}>
                    <Text style={styles.staffAvatarText}>{s.name[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.staffName}>{s.name}</Text>
                    <Text style={styles.staffSub}>{s.count} sales</Text>
                  </View>
                  <Text style={styles.staffAmount}>Rs.{s.total.toLocaleString()}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/items")}>
              <Ionicons name="cube-outline" size={24} color={colors.primary} />
              <Text style={styles.actionLabel}>Items</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/staff")}>
              <Ionicons name="people-outline" size={24} color={colors.primary} />
              <Text style={styles.actionLabel}>Staff</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/drawer")}>
              <Ionicons name="menu-outline" size={24} color={colors.primary} />
              <Text style={styles.actionLabel}>Menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  cardsRow: {
    flexDirection: "row",
    padding: spacing.md,
    gap: 12,
  },
  card: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPrimary: { backgroundColor: colors.primary },
  cardGreen: { backgroundColor: "#0D9488" },
  cardLabel: { fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "600", marginBottom: 4 },
  cardValue: { fontSize: 22, fontWeight: "800", color: "#fff" },
  cardSub: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  tabRow: {
    flexDirection: "row",
    marginHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: radius.sm,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  tabTextActive: { color: "#fff" },
  section: {
    backgroundColor: colors.white,
    margin: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginBottom: 12 },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: "center", paddingVertical: 16 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
  barLabel: { width: 60, fontSize: 12, color: colors.textPrimary, fontWeight: "600" },
  barTrack: { flex: 1, height: 10, backgroundColor: colors.bg, borderRadius: 5, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 5 },
  barValue: { width: 80, fontSize: 11, color: colors.textSecondary, textAlign: "right" },
  staffRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  staffAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  staffAvatarText: { fontSize: 16, fontWeight: "700", color: colors.primary },
  staffName: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  staffSub: { fontSize: 12, color: colors.textSecondary },
  staffAmount: { fontSize: 14, fontWeight: "700", color: colors.primary },
  actionsRow: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    gap: 6,
  },
  actionLabel: { fontSize: 12, fontWeight: "600", color: colors.primary },
});
