import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Modal, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getUser } from "../lib/auth";
import { cachedFetchAsync } from "../lib/api";
import { colors, spacing, radius } from "../lib/theme";

type RangeKey = "today" | "yesterday" | "week" | "month" | "lastmonth" | "year" | "custom";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "lastmonth", label: "Last Month" },
  { key: "year", label: "This Year" },
  { key: "custom", label: "Custom" },
];

function rangeToDates(range: RangeKey, customFrom: string, customTo: string): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  if (range === "custom") return { from: customFrom + "T00:00:00", to: customTo + "T23:59:59" };
  if (range === "today") { const t = fmt(now); return { from: t + "T00:00:00", to: t + "T23:59:59" }; }
  if (range === "yesterday") { const y = new Date(now); y.setDate(y.getDate()-1); const t = fmt(y); return { from: t + "T00:00:00", to: t + "T23:59:59" }; }
  if (range === "week") { const s = new Date(now); s.setDate(now.getDate()-now.getDay()); return { from: fmt(s)+"T00:00:00", to: fmt(now)+"T23:59:59" }; }
  if (range === "month") { const s = new Date(now.getFullYear(),now.getMonth(),1); return { from: fmt(s)+"T00:00:00", to: fmt(now)+"T23:59:59" }; }
  if (range === "lastmonth") { const s = new Date(now.getFullYear(),now.getMonth()-1,1); const e = new Date(now.getFullYear(),now.getMonth(),0); return { from: fmt(s)+"T00:00:00", to: fmt(e)+"T23:59:59" }; }
  if (range === "year") { const s = new Date(now.getFullYear(),0,1); return { from: fmt(s)+"T00:00:00", to: fmt(now)+"T23:59:59" }; }
  return { from: "", to: "" };
}

function formatDate(val: any): string {
  if (!val) return "—";
  const d = val instanceof Date ? val : new Date(typeof val === "number" ? val * 1000 : val);
  if (isNaN(d.getTime())) return String(val);
  const dd = d.getDate().toString().padStart(2,"0");
  const mm = (d.getMonth()+1).toString().padStart(2,"0");
  const yy = d.getFullYear().toString().slice(2);
  return `${dd}.${mm}.${yy}`;
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1 }}>
        <Text style={dpStyles.label}>{label}</Text>
        <input type="date" value={value} onChange={(e) => onChange(e.target.value)}
          style={{ border: "1px solid #ddd", borderRadius: 6, padding: "7px 10px", fontSize: 13, width: "100%", boxSizing: "border-box" }} />
      </View>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <Text style={dpStyles.label}>{label}</Text>
      <TextInput style={dpStyles.input} value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" placeholderTextColor="#aaa" />
    </View>
  );
}
const dpStyles = StyleSheet.create({
  label: { fontSize: 11, color: "#888", marginBottom: 4, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, color: "#222" },
});

export default function CommissionScreen() {
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<RangeKey>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [pendingFrom, setPendingFrom] = useState("");
  const [pendingTo, setPendingTo] = useState("");
  const [expandedStaff, setExpandedStaff] = useState<number | null>(null);

  const load = async (u?: any, silent?: boolean) => {
    if (!silent) setLoading(true);
    const currentUser = u ?? user ?? await getUser();
    if (!currentUser) { setLoading(false); return; }
    if (!u && !user) setUser(currentUser);

    const { from, to } = rangeToDates(range, customFrom, customTo);
    const isAdmin = currentUser.role === "admin";
    let url = `reports/commission?shopId=${currentUser.shopId}`;
    if (from && to) url += `&from=${from}&to=${to}`;
    // Non-admin: only see their own commission
    if (!isAdmin) url += `&userId=${currentUser.id}`;

    const d = await cachedFetchAsync(url);
    if (d && !d.error) setData(d);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => {
    getUser().then((u) => {
      setUser(u);
      load(u);
    });
  }, [range, customFrom, customTo]));

  const onRefresh = () => { setRefreshing(true); load(null, true); };

  const selectRange = (r: RangeKey) => {
    if (r === "custom") {
      const today = new Date().toISOString().slice(0,10);
      setPendingFrom(customFrom || today);
      setPendingTo(customTo || today);
      setShowCustomModal(true);
      return;
    }
    setRange(r);
  };

  const applyCustom = () => {
    if (!pendingFrom || !pendingTo) return;
    setCustomFrom(pendingFrom);
    setCustomTo(pendingTo);
    setRange("custom");
    setShowCustomModal(false);
  };

  const isAdmin = user?.role === "admin";

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Commission</Text>
        </View>
        <ActivityIndicator style={{ padding: 40 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  const rows: any[] = data?.rows ?? [];
  const grandCommission = data?.grandCommission ?? 0;
  const grandTotal = data?.grandTotal ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {/* Header */}
      <View style={styles.topBar}>
        <Ionicons name="ribbon-outline" size={20} color={colors.primary} />
        <Text style={styles.topBarTitle}>
          {isAdmin ? "Staff Commission" : "My Commission"}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Range chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.rangeScroll} contentContainerStyle={styles.rangeRow}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.rangeChip, range === r.key && styles.rangeChipActive]}
              onPress={() => selectRange(r.key)}
            >
              <Text style={[styles.rangeChipText, range === r.key && styles.rangeChipTextActive]}>
                {r.key === "custom" && customFrom && customTo && range === "custom"
                  ? `${customFrom.slice(5)} → ${customTo.slice(5)}`
                  : r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ padding: spacing.md, paddingTop: 8 }}>

          {/* Summary cards */}
          <View style={styles.cardRow}>
            <View style={[styles.summaryCard, { backgroundColor: "#7C3AED" }]}>
              <Ionicons name="ribbon" size={22} color="rgba(255,255,255,0.8)" />
              <Text style={styles.cardVal}>Rs.{grandCommission.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>
              <Text style={styles.cardLabel}>Total Commission</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
              <Ionicons name="trending-up" size={22} color="rgba(255,255,255,0.8)" />
              <Text style={styles.cardVal}>Rs.{grandTotal.toLocaleString()}</Text>
              <Text style={styles.cardLabel}>Total Sales</Text>
            </View>
          </View>

          {rows.length === 0 && (
            <View style={styles.emptyBox}>
              <Ionicons name="ribbon-outline" size={40} color="#ccc" />
              <Text style={styles.emptyText}>No commission data for this period</Text>
            </View>
          )}

          {/* Staff rows (admin sees all, staff sees only themselves) */}
          {rows.map((staff: any) => {
            const isExpanded = expandedStaff === staff.userId;
            const commPct = staff.totalSales > 0
              ? ((staff.totalCommission / staff.totalSales) * 100).toFixed(1)
              : "0.0";

            return (
              <View key={staff.userId} style={styles.staffCard}>
                {/* Staff header */}
                <TouchableOpacity
                  style={styles.staffHeader}
                  onPress={() => setExpandedStaff(isExpanded ? null : staff.userId)}
                  activeOpacity={0.7}
                >
                  <View style={styles.staffAvatar}>
                    <Text style={styles.staffAvatarText}>{(staff.name ?? "?")[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.staffName}>{staff.name}</Text>
                    <View style={styles.staffMeta}>
                      <View style={styles.rolePill}>
                        <Text style={styles.rolePillText}>{staff.role}</Text>
                      </View>
                      <Text style={styles.staffSub}>{staff.items?.length ?? 0} items sold</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.commAmount}>
                      Rs.{staff.totalCommission.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </Text>
                    <Text style={styles.commPct}>{commPct}% of sales</Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={16} color="#999" style={{ marginLeft: 6 }}
                  />
                </TouchableOpacity>

                {/* Expanded: per-item breakdown */}
                {isExpanded && (
                  <View style={styles.breakdown}>
                    <View style={styles.breakdownHeader}>
                      <Text style={[styles.bh, { flex: 1.5 }]}>Item</Text>
                      <Text style={[styles.bh, { flex: 0.5, textAlign: "center" }]}>Qty</Text>
                      <Text style={[styles.bh, { flex: 1, textAlign: "right" }]}>Sales</Text>
                      <Text style={[styles.bh, { flex: 0.6, textAlign: "center" }]}>Rate</Text>
                      <Text style={[styles.bh, { flex: 1, textAlign: "right" }]}>Comm.</Text>
                    </View>

                    {/* Group items by item name */}
                    {(() => {
                      const grouped = new Map<string, any>();
                      (staff.items ?? []).forEach((it: any) => {
                        const k = it.itemName;
                        if (!grouped.has(k)) grouped.set(k, { ...it, qty: 0, total: 0, commissionAmount: 0 });
                        const g = grouped.get(k)!;
                        g.qty += it.qty;
                        g.total += Number(it.total ?? 0);
                        g.commissionAmount += Number(it.commissionAmount ?? 0);
                      });
                      return Array.from(grouped.values()).map((it, i) => (
                        <View key={i} style={[styles.breakdownRow, i % 2 === 1 && { backgroundColor: "#fafafa" }]}>
                          <Text style={[styles.bd, { flex: 1.5 }]} numberOfLines={1}>{it.itemName}</Text>
                          <Text style={[styles.bd, { flex: 0.5, textAlign: "center", fontWeight: "700" }]}>{it.qty}</Text>
                          <Text style={[styles.bd, { flex: 1, textAlign: "right" }]}>
                            Rs.{Number(it.total ?? 0).toLocaleString()}
                          </Text>
                          <Text style={[styles.bd, { flex: 0.6, textAlign: "center", color: "#7C3AED", fontWeight: "600" }]}>
                            {it.commissionRate ?? 0}%
                          </Text>
                          <Text style={[styles.bd, { flex: 1, textAlign: "right", fontWeight: "700", color: "#16a34a" }]}>
                            Rs.{Number(it.commissionAmount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </Text>
                        </View>
                      ));
                    })()}

                    {/* Staff total row */}
                    <View style={styles.totalRow}>
                      <Text style={[styles.totalLabel, { flex: 2 }]}>Total</Text>
                      <Text style={[styles.totalLabel, { flex: 1, textAlign: "right" }]}>
                        Rs.{staff.totalSales.toLocaleString()}
                      </Text>
                      <Text style={[styles.totalLabel, { flex: 0.6, textAlign: "center" }]}></Text>
                      <Text style={[styles.totalLabel, { flex: 1, textAlign: "right", color: "#7C3AED" }]}>
                        Rs.{staff.totalCommission.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </Text>
                    </View>

                    {/* Note if user has a fixed commission rate too */}
                    {staff.userCommissionRate > 0 && (
                      <View style={styles.noteBox}>
                        <Ionicons name="information-circle-outline" size={14} color="#7C3AED" />
                        <Text style={styles.noteText}>
                          Staff base commission rate: {staff.userCommissionRate}% (applied per-item above)
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Custom Date Modal */}
      <Modal visible={showCustomModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCustomModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <Text style={styles.modalTitle}>Custom Date Range</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <DateInput label="From" value={pendingFrom} onChange={setPendingFrom} />
              <DateInput label="To" value={pendingTo} onChange={setPendingTo} />
            </View>
            <View style={{ flexDirection: "row", gap: 12, justifyContent: "flex-end" }}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setShowCustomModal(false)}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#555" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnApply} onPress={applyCustom}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>Apply</Text>
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
  topBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff", paddingHorizontal: spacing.md, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  topBarTitle: { fontSize: 17, fontWeight: "800", color: colors.textPrimary },

  rangeScroll: { flexGrow: 0, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.border },
  rangeRow: { flexDirection: "row", gap: 6, paddingHorizontal: spacing.md, paddingVertical: 10 },
  rangeChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: "#ddd", backgroundColor: "#fff",
  },
  rangeChipActive: { borderColor: "#7C3AED", backgroundColor: "#f5f3ff" },
  rangeChipText: { fontSize: 12, fontWeight: "600", color: "#666" },
  rangeChipTextActive: { color: "#7C3AED", fontWeight: "700" },

  cardRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1, borderRadius: radius.md, padding: 14,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  cardVal: { fontSize: 20, fontWeight: "800", color: "#fff", marginTop: 6 },
  cardLabel: { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 },

  emptyBox: { alignItems: "center", paddingVertical: 48 },
  emptyText: { marginTop: 10, fontSize: 13, color: "#aaa", textAlign: "center" },

  staffCard: {
    backgroundColor: "#fff", borderRadius: radius.md, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
    overflow: "hidden",
  },
  staffHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  staffAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "#7C3AED",
    alignItems: "center", justifyContent: "center",
  },
  staffAvatarText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  staffName: { fontSize: 14, fontWeight: "700", color: "#222" },
  staffMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  rolePill: {
    backgroundColor: "#f3f0ff", paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 6,
  },
  rolePillText: { fontSize: 10, fontWeight: "700", color: "#7C3AED", textTransform: "capitalize" },
  staffSub: { fontSize: 11, color: "#999" },
  commAmount: { fontSize: 15, fontWeight: "800", color: "#16a34a" },
  commPct: { fontSize: 11, color: "#999", marginTop: 2 },

  breakdown: { borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  breakdownHeader: {
    flexDirection: "row", paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: "#f5f5f5", borderBottomWidth: 1, borderBottomColor: "#eee",
  },
  bh: { fontSize: 10, fontWeight: "700", color: "#777" },
  breakdownRow: {
    flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0", alignItems: "center",
  },
  bd: { fontSize: 11, color: "#333" },
  totalRow: {
    flexDirection: "row", paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: "#f0fdf4", borderTopWidth: 2, borderTopColor: "#bbf7d0",
  },
  totalLabel: { fontSize: 12, fontWeight: "800", color: "#166534" },
  noteBox: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: "#f5f3ff", borderTopWidth: 1, borderTopColor: "#e9d5ff",
  },
  noteText: { fontSize: 11, color: "#7C3AED", flex: 1 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, gap: 16 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#222" },
  btnCancel: { paddingVertical: 9, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: "#ddd" },
  btnApply: { paddingVertical: 9, paddingHorizontal: 24, borderRadius: 8, backgroundColor: "#7C3AED" },
});
