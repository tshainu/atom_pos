import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Modal, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getUser } from "../../lib/auth";
import { apiFetch, cachedFetchAsync } from "../../lib/api";
import { colors, spacing, radius } from "../../lib/theme";

interface CreditSale {
  id: number;
  billNumber: string;
  customerName: string;
  customerPhone?: string;
  netPay: number;
  collectedAmount: number;
  promisedDate?: string;
  createdAt: any;
}

function formatDate(val: any): string {
  if (!val) return "—";
  const d = val instanceof Date ? val : new Date(typeof val === "number" ? val * 1000 : val);
  if (isNaN(d.getTime())) return String(val);
  return `${d.getDate().toString().padStart(2,"0")}.${(d.getMonth()+1).toString().padStart(2,"0")}.${d.getFullYear().toString().slice(2)}`;
}

export default function CreditCollectionScreen() {
  const [user, setUser] = useState<any>(null);
  const [sales, setSales] = useState<CreditSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<CreditSale | null>(null);
  const [payModal, setPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const applyData = (data: any) => {
    if (!data?.error) {
      const filtered = (data.sales ?? []).filter((s: CreditSale) => (s.netPay - (s.collectedAmount ?? 0)) > 0);
      setSales(filtered);
    }
  };

  const load = async () => {
    const u = await getUser();
    setUser(u);
    if (!u) { setLoading(false); return; }
    const cached = await cachedFetchAsync(`credit-sales?shopId=${u.shopId}`);
    if (cached) { applyData(cached); setLoading(false); }
    apiFetch(`credit-sales?shopId=${u.shopId}`).then((data) => { applyData(data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);
  useFocusEffect(useCallback(() => { load(); }, []));

  const openPayModal = (sale: CreditSale) => {
    setSelectedSale(sale);
    setPayAmount("");
    setPayModal(true);
  };

  const submitPayment = async () => {
    if (!selectedSale || !user) return;
    const amount = parseFloat(payAmount);
    const outstanding = selectedSale.netPay - (selectedSale.collectedAmount ?? 0);
    if (!amount || amount <= 0) { Alert.alert("Error", "Enter a valid amount"); return; }
    if (amount > outstanding) { Alert.alert("Error", `Amount exceeds outstanding balance Rs.${outstanding.toLocaleString()}`); return; }

    setSubmitting(true);
    try {
      const data = await apiFetch("credit-collections", {
        method: "POST",
        body: JSON.stringify({
          saleId: selectedSale.id,
          shopId: user.shopId,
          userId: user.id,
          amount,
          note: "",
        }),
      });
      if (data?.error) { Alert.alert("Error", data.error); return; }
      Alert.alert("Success", `Collected Rs.${amount.toLocaleString()} from ${selectedSale.customerName}`);
      setPayModal(false);
      setSelectedSale(null);
      load();
    } catch {
      Alert.alert("Error", "Failed to save collection");
    } finally {
      setSubmitting(false);
    }
  };

  const outstanding = (sale: CreditSale) => sale.netPay - (sale.collectedAmount ?? 0);

  if (loading && sales.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={{ padding: 16, gap: 12 }}>
          {[1,2,3].map((i) => <View key={i} style={{ height: 80, borderRadius: 12, backgroundColor: "#e8e8e8" }} />)}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Credit Collection</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: "#EA580C" }]}>
            <Text style={styles.summaryVal}>Rs.{sales.reduce((s, c) => s + outstanding(c), 0).toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Total Outstanding</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.summaryVal}>{sales.length}</Text>
            <Text style={styles.summaryLabel}>Pending Bills</Text>
          </View>
        </View>

        {sales.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.primary} />
            <Text style={styles.emptyTitle}>All Clear!</Text>
            <Text style={styles.emptyText}>No outstanding credit balances.</Text>
          </View>
        ) : (
          sales.map((sale) => {
            const bal = outstanding(sale);
            const pct = Math.round(((sale.collectedAmount ?? 0) / sale.netPay) * 100);
            return (
              <View key={sale.id} style={styles.saleCard}>
                <View style={styles.saleHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.saleName}>{sale.customerName || "Unknown"}</Text>
                    {sale.customerPhone ? (
                      <Text style={styles.saleSub}>{sale.customerPhone}</Text>
                    ) : null}
                  </View>
                  <View style={styles.saleBill}>
                    <Text style={styles.saleBillText}>{(sale.billNumber ?? "").replace("BILL-", "")}</Text>
                    <Text style={styles.saleDate}>{formatDate(sale.createdAt)}</Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{pct}% paid</Text>
                </View>

                <View style={styles.amountRow}>
                  <View>
                    <Text style={styles.amountLabel}>Bill Total</Text>
                    <Text style={styles.amountVal}>Rs.{sale.netPay.toLocaleString()}</Text>
                  </View>
                  <View>
                    <Text style={styles.amountLabel}>Collected</Text>
                    <Text style={[styles.amountVal, { color: "#16a34a" }]}>Rs.{(sale.collectedAmount ?? 0).toLocaleString()}</Text>
                  </View>
                  <View>
                    <Text style={styles.amountLabel}>Balance</Text>
                    <Text style={[styles.amountVal, { color: "#e53935" }]}>Rs.{bal.toLocaleString()}</Text>
                  </View>
                </View>

                {sale.promisedDate ? (
                  <View style={styles.promisedRow}>
                    <Ionicons name="calendar-outline" size={12} color="#7C3AED" />
                    <Text style={styles.promisedText}>Promised: {sale.promisedDate}</Text>
                  </View>
                ) : null}

                <TouchableOpacity style={styles.collectBtn} onPress={() => openPayModal(sale)}>
                  <Ionicons name="cash-outline" size={16} color="#fff" />
                  <Text style={styles.collectBtnText}>Collect Payment</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={payModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => !submitting && setPayModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <Text style={styles.modalTitle}>Collect Payment</Text>
            {selectedSale && (
              <>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Customer</Text>
                  <Text style={styles.modalInfoVal}>{selectedSale.customerName}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Outstanding</Text>
                  <Text style={[styles.modalInfoVal, { color: "#e53935", fontWeight: "800" }]}>
                    Rs.{outstanding(selectedSale).toLocaleString()}
                  </Text>
                </View>

                <Text style={styles.inputLabel}>Amount to Collect</Text>
                <TextInput
                  style={styles.amountInput}
                  value={payAmount}
                  onChangeText={setPayAmount}
                  keyboardType="numeric"
                  placeholder={`Max Rs.${outstanding(selectedSale).toLocaleString()}`}
                  placeholderTextColor="#aaa"
                  autoFocus
                />

                {/* Quick fill buttons */}
                <View style={styles.quickBtns}>
                  <TouchableOpacity
                    style={styles.quickBtn}
                    onPress={() => setPayAmount(outstanding(selectedSale).toString())}
                  >
                    <Text style={styles.quickBtnText}>Full Amount</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickBtn}
                    onPress={() => setPayAmount(Math.round(outstanding(selectedSale) / 2).toString())}
                  >
                    <Text style={styles.quickBtnText}>Half</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setPayModal(false)} disabled={submitting}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, submitting && { opacity: 0.6 }]} onPress={submitPayment} disabled={submitting}>
                    {submitting
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.saveBtnText}>Save</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    backgroundColor: colors.primary, flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.md, paddingVertical: 14, gap: 12,
  },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
  scroll: { padding: spacing.md, paddingBottom: 40 },

  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, borderRadius: radius.md, padding: 14, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  summaryVal: { fontSize: 20, fontWeight: "800", color: "#fff" },
  summaryLabel: { fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 2 },

  empty: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  emptyText: { fontSize: 14, color: colors.textSecondary },

  saleCard: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  saleHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  saleName: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  saleSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  saleBill: { alignItems: "flex-end" },
  saleBillText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  saleDate: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  progressTrack: { flex: 1, height: 6, backgroundColor: "#f0f0f0", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#16a34a", borderRadius: 3 },
  progressText: { fontSize: 11, fontWeight: "600", color: "#16a34a", minWidth: 45 },

  amountRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  amountLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
  amountVal: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },

  promisedRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10 },
  promisedText: { fontSize: 12, color: "#7C3AED", fontWeight: "600" },

  collectBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 10,
  },
  collectBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, gap: 12 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#222", textAlign: "center" },
  modalInfoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  modalInfoLabel: { fontSize: 13, color: "#555" },
  modalInfoVal: { fontSize: 13, fontWeight: "600", color: "#222" },
  inputLabel: { fontSize: 12, color: "#888", fontWeight: "600", marginTop: 4 },
  amountInput: {
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 20, fontWeight: "700",
    color: "#222", textAlign: "center",
  },
  quickBtns: { flexDirection: "row", gap: 10 },
  quickBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.primaryLight, alignItems: "center",
  },
  quickBtnText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "#ddd", alignItems: "center" },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#555" },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center" },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
