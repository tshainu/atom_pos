import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getUser } from "../../lib/auth";
import { apiFetch } from "../../lib/api";
import { colors, spacing, radius } from "../../lib/theme";
import { Ionicons } from "@expo/vector-icons";

interface Sale {
  id: number;
  billNumber: string;
  subtotal: number;
  discount: number;
  netPay: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

export default function ReportsScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

  const load = async () => {
    const u = await getUser();
    setUser(u);
    if (!u) return;
    const [salesData, summaryData] = await Promise.all([
      apiFetch(`sales?shopId=${u.shopId}`),
      apiFetch(`reports/summary?shopId=${u.shopId}`),
    ]);
    if (!salesData.error) setSales(salesData.sales ?? []);
    if (!summaryData.error) setSummary(summaryData);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const cashSales = sales.filter((s) => s.paymentMethod === "cash");
  const creditSales = sales.filter((s) => s.paymentMethod === "credit");
  const cashTotal = cashSales.reduce((s, sale) => s + sale.netPay, 0);
  const creditTotal = creditSales.reduce((s, sale) => s + sale.netPay, 0);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Summary Cards */}
        <View style={styles.cardsRow}>
          <View style={[styles.card, { backgroundColor: colors.primary }]}>
            <Ionicons name="trending-up-outline" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.cardValue}>Rs.{(summary?.totalSales ?? 0).toLocaleString()}</Text>
            <Text style={styles.cardLabel}>Total Revenue</Text>
          </View>
          <View style={[styles.card, { backgroundColor: "#0D9488" }]}>
            <Ionicons name="receipt-outline" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.cardValue}>{summary?.totalBills ?? 0}</Text>
            <Text style={styles.cardLabel}>Total Bills</Text>
          </View>
        </View>

        <View style={styles.cardsRow}>
          <View style={[styles.card, { backgroundColor: colors.success }]}>
            <Ionicons name="cash-outline" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.cardValue}>Rs.{cashTotal.toLocaleString()}</Text>
            <Text style={styles.cardLabel}>Cash</Text>
          </View>
          <View style={[styles.card, { backgroundColor: colors.warning }]}>
            <Ionicons name="card-outline" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.cardValue}>Rs.{creditTotal.toLocaleString()}</Text>
            <Text style={styles.cardLabel}>Credit</Text>
          </View>
        </View>

        {/* Staff Sales */}
        {summary?.staffSales?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Staff Performance</Text>
            {summary.staffSales.map((s: any) => (
              <View key={s.userId} style={styles.staffRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{s.name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.staffName}>{s.name}</Text>
                  <Text style={styles.staffSub}>{s.count} transactions</Text>
                </View>
                <Text style={styles.staffAmount}>Rs.{s.total.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent Bills */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Bills</Text>
          {sales.length === 0 ? (
            <Text style={styles.emptyText}>No bills yet</Text>
          ) : (
            sales.slice(0, 20).map((sale) => (
              <View key={sale.id} style={styles.saleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.saleBill}>{sale.billNumber}</Text>
                  <Text style={styles.saleMeta}>
                    {new Date(sale.createdAt).toLocaleDateString()} · {sale.paymentMethod}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.saleAmount}>Rs.{sale.netPay.toLocaleString()}</Text>
                  {sale.discount > 0 && (
                    <Text style={styles.saleDiscount}>-Rs.{sale.discount.toLocaleString()}</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  cardsRow: { flexDirection: "row", paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: 12 },
  card: {
    flex: 1, borderRadius: radius.lg, padding: spacing.md,
    gap: 4, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardValue: { fontSize: 20, fontWeight: "800", color: "#fff" },
  cardLabel: { fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "600" },
  section: {
    backgroundColor: colors.white, margin: spacing.md, marginTop: spacing.sm,
    borderRadius: radius.lg, padding: spacing.md,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginBottom: 12 },
  emptyText: { textAlign: "center", color: colors.textSecondary, fontSize: 13, paddingVertical: 12 },
  staffRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "700", color: colors.primary },
  staffName: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  staffSub: { fontSize: 12, color: colors.textSecondary },
  staffAmount: { fontSize: 14, fontWeight: "700", color: colors.primary },
  saleRow: {
    flexDirection: "row", paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  saleBill: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  saleMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  saleAmount: { fontSize: 14, fontWeight: "700", color: colors.primary },
  saleDiscount: { fontSize: 11, color: colors.danger },
});
