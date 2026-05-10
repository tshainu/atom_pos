import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions, TextInput, Modal, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { getUser } from "../../lib/auth";
import { apiFetch } from "../../lib/api";
import { colors, spacing, radius } from "../../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Polyline, Line, Text as SvgText, Circle, Rect, Defs, LinearGradient, Stop } from "react-native-svg";

const { width: SCREEN_W } = Dimensions.get("window");
const CHART_W = SCREEN_W - 48;
const CHART_H = 180;
const PAD_L = 52;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 36;

type RangeKey = "today" | "week" | "month" | "lastmonth" | "year" | "custom";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "lastmonth", label: "Last Month" },
  { key: "year", label: "This Year" },
  { key: "custom", label: "Custom" },
];

interface ChartPoint { label: string; value: number; }
interface ChartData { points: ChartPoint[]; totalSales: number; totalBills: number; groupBy: string; }
interface StaffSale { userId: number; name: string; total: number; count: number; }
interface Summary { totalSales: number; totalItems: number; totalBills: number; staffSales: StaffSale[]; }

// ── Mini SVG Line Chart ──────────────────────────────────────────────
function SalesChart({ data }: { data: ChartData }) {
  const pts = data.points;
  if (!pts.length) return <Text style={{ color: "#aaa", textAlign: "center", paddingVertical: 30 }}>No data</Text>;

  const maxVal = Math.max(...pts.map((p) => p.value), 1);
  const plotW = CHART_W - PAD_L - PAD_R;
  const plotH = CHART_H - PAD_T - PAD_B;

  const x = (i: number) => PAD_L + (i / Math.max(pts.length - 1, 1)) * plotW;
  const y = (v: number) => PAD_T + plotH - (v / maxVal) * plotH;

  const linePoints = pts.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const areaPoints = `${x(0)},${PAD_T + plotH} ${linePoints} ${x(pts.length - 1)},${PAD_T + plotH}`;

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    val: Math.round(maxVal * t),
    py: y(maxVal * t),
  }));

  // X-axis labels — show max 7 evenly
  const step = Math.max(1, Math.ceil(pts.length / 7));
  const xLabels = pts
    .map((p, i) => ({ label: p.label, px: x(i), i }))
    .filter((_, i) => i % step === 0 || i === pts.length - 1);

  const [tooltip, setTooltip] = useState<{ i: number; px: number; py: number } | null>(null);

  return (
    <View>
      <Svg width={CHART_W} height={CHART_H}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#4CAF50" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#4CAF50" stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <Line key={i} x1={PAD_L} y1={t.py} x2={CHART_W - PAD_R} y2={t.py}
            stroke="#f0f0f0" strokeWidth="1" />
        ))}
        {/* Y labels */}
        {yTicks.map((t, i) => (
          <SvgText key={i} x={PAD_L - 6} y={t.py + 4} fontSize="9" fill="#aaa" textAnchor="end">
            {t.val >= 1000 ? `${(t.val / 1000).toFixed(0)}k` : String(t.val)}
          </SvgText>
        ))}
        {/* Area fill */}
        <Polyline points={areaPoints} fill="url(#grad)" stroke="none" />
        {/* Line */}
        <Polyline points={linePoints} fill="none" stroke="#4CAF50" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots */}
        {pts.map((p, i) => (
          <Circle
            key={i}
            cx={x(i)} cy={y(p.value)} r={tooltip?.i === i ? 5 : 3}
            fill={tooltip?.i === i ? "#4CAF50" : "#fff"}
            stroke="#4CAF50" strokeWidth="2"
            onPress={() => setTooltip(tooltip?.i === i ? null : { i, px: x(i), py: y(p.value) })}
          />
        ))}
        {/* Tooltip */}
        {tooltip && (() => {
          const p = pts[tooltip.i];
          const bx = Math.min(Math.max(tooltip.px - 38, PAD_L), CHART_W - PAD_R - 76);
          const by = Math.max(tooltip.py - 38, PAD_T);
          return (
            <>
              <Rect x={bx} y={by} width={76} height={26} rx={5} fill="#222" opacity={0.85} />
              <SvgText x={bx + 38} y={by + 17} fontSize="11" fill="#fff" textAnchor="middle" fontWeight="bold">
                Rs.{p.value.toLocaleString()}
              </SvgText>
            </>
          );
        })()}
        {/* X labels */}
        {xLabels.map((l) => (
          <SvgText key={l.i} x={l.px} y={CHART_H - 4} fontSize="9" fill="#aaa" textAnchor="middle">
            {l.label}
          </SvgText>
        ))}
        {/* Axes */}
        <Line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} stroke="#e0e0e0" strokeWidth="1" />
        <Line x1={PAD_L} y1={PAD_T + plotH} x2={CHART_W - PAD_R} y2={PAD_T + plotH} stroke="#e0e0e0" strokeWidth="1" />
      </Svg>
    </View>
  );
}

// ── Date Picker (web-native input for web, text fallback) ─────────────
function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1 }}>
        <Text style={dpStyles.label}>{label}</Text>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ border: "1px solid #ddd", borderRadius: 6, padding: "7px 10px", fontSize: 13, width: "100%", boxSizing: "border-box" }}
        />
      </View>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <Text style={dpStyles.label}>{label}</Text>
      <TextInput
        style={dpStyles.input}
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#aaa"
      />
    </View>
  );
}

const dpStyles = StyleSheet.create({
  label: { fontSize: 11, color: "#888", marginBottom: 4, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, color: "#222" },
});

// ── Main Dashboard ───────────────────────────────────────────────────
export default function DashboardScreen() {
  const [user, setUser] = useState<any>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"sales" | "staff">("sales");
  const [range, setRange] = useState<RangeKey>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [pendingFrom, setPendingFrom] = useState("");
  const [pendingTo, setPendingTo] = useState("");

  const loadSummary = async (u: any) => {
    const data = await apiFetch(`reports/summary?shopId=${u.shopId}`);
    if (!data.error) setSummary(data);
  };

  const loadChart = async (u: any, r: RangeKey, cf = customFrom, ct = customTo) => {
    setChartLoading(true);
    let url = `reports/sales-chart?shopId=${u.shopId}&range=${r}`;
    if (r === "custom" && cf && ct) url += `&from=${cf}T00:00:00&to=${ct}T23:59:59`;
    const data = await apiFetch(url);
    if (!data.error) setChartData(data);
    setChartLoading(false);
  };

  const load = async () => {
    const u = await getUser();
    setUser(u);
    if (u) {
      await Promise.all([loadSummary(u), loadChart(u, range)]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const selectRange = async (r: RangeKey) => {
    if (r === "custom") {
      const today = new Date().toISOString().slice(0, 10);
      setPendingFrom(customFrom || today);
      setPendingTo(customTo || today);
      setShowCustomModal(true);
      return;
    }
    setRange(r);
    if (user) loadChart(user, r);
  };

  const applyCustom = () => {
    if (!pendingFrom || !pendingTo) return;
    setCustomFrom(pendingFrom);
    setCustomTo(pendingTo);
    setRange("custom");
    setShowCustomModal(false);
    if (user) loadChart(user, "custom", pendingFrom, pendingTo);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const maxStaff = summary?.staffSales.reduce((m, s) => Math.max(m, s.total), 1) ?? 1;
  const activeRange = RANGES.find((r) => r.key === range);

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

        {/* ── Sales Graph ── */}
        <View style={styles.section}>
          {/* Header row */}
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.sectionTitle}>Sales Graph</Text>
              {chartData && (
                <Text style={styles.chartMeta}>
                  Rs.{chartData.totalSales.toLocaleString()} · {chartData.totalBills} bills
                </Text>
              )}
            </View>
          </View>

          {/* Range toggle — scrollable */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rangeScroll} contentContainerStyle={styles.rangeRow}>
            {RANGES.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[styles.rangeChip, range === r.key && styles.rangeChipActive]}
                onPress={() => selectRange(r.key)}
              >
                <Text style={[styles.rangeChipText, range === r.key && styles.rangeChipTextActive]}>
                  {r.key === "custom" && customFrom && customTo && range === "custom"
                    ? `${customFrom} → ${customTo}`
                    : r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Chart */}
          <View style={styles.chartArea}>
            {chartLoading ? (
              <View style={styles.chartLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : chartData ? (
              <SalesChart data={chartData} />
            ) : (
              <Text style={styles.emptyText}>No data</Text>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, activeTab === "sales" && styles.tabActive]} onPress={() => setActiveTab("sales")}>
            <Text style={[styles.tabText, activeTab === "sales" && styles.tabTextActive]}>Product Sales</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === "staff" && styles.tabActive]} onPress={() => setActiveTab("staff")}>
            <Text style={[styles.tabText, activeTab === "staff" && styles.tabTextActive]}>Staff & Sales</Text>
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
                  <Text style={styles.barLabel} numberOfLines={1}>{s.name}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.round((s.total / maxStaff) * 100)}%` }]} />
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
              summary?.staffSales.map((s) => (
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

      {/* Custom Date Range Modal */}
      <Modal visible={showCustomModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCustomModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <Text style={styles.modalTitle}>Custom Date Range</Text>
            <View style={styles.dateRow}>
              <DateInput label="From" value={pendingFrom} onChange={setPendingFrom} />
              <View style={{ width: 12 }} />
              <DateInput label="To" value={pendingTo} onChange={setPendingTo} />
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowCustomModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalApply} onPress={applyCustom}>
                <Text style={styles.modalApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  cardsRow: { flexDirection: "row", padding: spacing.md, gap: 12 },
  card: { flex: 1, borderRadius: radius.lg, padding: spacing.md, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardPrimary: { backgroundColor: colors.primary },
  cardGreen: { backgroundColor: "#0D9488" },
  cardLabel: { fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "600", marginBottom: 4 },
  cardValue: { fontSize: 22, fontWeight: "800", color: "#fff" },
  cardSub: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 },

  section: {
    backgroundColor: colors.white, margin: spacing.md, marginTop: spacing.sm,
    borderRadius: radius.lg, padding: spacing.md,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: "center", paddingVertical: 16 },

  // Chart
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  chartMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rangeScroll: { flexGrow: 0, marginBottom: 12 },
  rangeRow: { flexDirection: "row", gap: 6, paddingVertical: 2 },
  rangeChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: "#ddd", backgroundColor: "#fff",
  },
  rangeChipActive: { borderColor: colors.primary, backgroundColor: "#f0fff0" },
  rangeChipText: { fontSize: 12, fontWeight: "600", color: "#666" },
  rangeChipTextActive: { color: "#2e7d32", fontWeight: "700" },
  chartArea: { minHeight: CHART_H },
  chartLoader: { height: CHART_H, alignItems: "center", justifyContent: "center" },

  tabRow: {
    flexDirection: "row", marginHorizontal: spacing.md,
    backgroundColor: colors.white, borderRadius: radius.md,
    padding: 4, marginBottom: 4,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  tabTextActive: { color: "#fff" },

  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
  barLabel: { width: 60, fontSize: 12, color: colors.textPrimary, fontWeight: "600" },
  barTrack: { flex: 1, height: 10, backgroundColor: colors.bg, borderRadius: 5, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 5 },
  barValue: { width: 80, fontSize: 11, color: colors.textSecondary, textAlign: "right" },

  staffRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10,
  },
  staffAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center",
  },
  staffAvatarText: { fontSize: 16, fontWeight: "700", color: colors.primary },
  staffName: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  staffSub: { fontSize: 12, color: colors.textSecondary },
  staffAmount: { fontSize: 14, fontWeight: "700", color: colors.primary },

  actionsRow: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1, alignItems: "center", paddingVertical: 16,
    backgroundColor: colors.primaryLight, borderRadius: radius.md, gap: 6,
  },
  actionLabel: { fontSize: 12, fontWeight: "600", color: colors.primary },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, gap: 16 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#222" },
  dateRow: { flexDirection: "row", alignItems: "flex-end" },
  modalBtns: { flexDirection: "row", gap: 12, justifyContent: "flex-end" },
  modalCancel: { paddingVertical: 9, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: "#ddd" },
  modalCancelText: { fontSize: 14, fontWeight: "600", color: "#555" },
  modalApply: { paddingVertical: 9, paddingHorizontal: 24, borderRadius: 8, backgroundColor: colors.primary },
  modalApplyText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
