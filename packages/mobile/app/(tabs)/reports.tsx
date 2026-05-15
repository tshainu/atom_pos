import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Modal, Platform, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { getUser } from "../../lib/auth";
import { apiFetch, cachedFetchAsync } from "../../lib/api";
import { colors, spacing, radius } from "../../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { BLEPrinter, NetPrinter } from "react-native-thermal-receipt-printer-image-qr";

type RangeKey = "today" | "yesterday" | "week" | "month" | "lastmonth" | "year" | "custom";
type ReportTab = "sales" | "itemsales" | "items" | "creditsales" | "collections" | "staffsales";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "lastmonth", label: "Last Month" },
  { key: "year", label: "This Year" },
  { key: "custom", label: "Custom" },
];

const REPORT_TABS: { key: ReportTab; label: string; icon: string }[] = [
  { key: "sales", label: "Sales", icon: "trending-up-outline" },
  { key: "itemsales", label: "Item Sales", icon: "pricetag-outline" },
  { key: "items", label: "Items", icon: "cube-outline" },
  { key: "creditsales", label: "Credits", icon: "card-outline" },
  { key: "collections", label: "Collections", icon: "cash-outline" },
  { key: "staffsales", label: "Staff Sales", icon: "people-outline" },
];

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

function RangeSelector({ range, customFrom, customTo, onSelect }: {
  range: RangeKey; customFrom: string; customTo: string;
  onSelect: (r: RangeKey) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rangeScroll} contentContainerStyle={styles.rangeRow}>
      {RANGES.map((r) => (
        <TouchableOpacity
          key={r.key}
          style={[styles.rangeChip, range === r.key && styles.rangeChipActive]}
          onPress={() => onSelect(r.key)}
        >
          <Text style={[styles.rangeChipText, range === r.key && styles.rangeChipTextActive]}>
            {r.key === "custom" && customFrom && customTo && range === "custom"
              ? `${customFrom.slice(5)} → ${customTo.slice(5)}`
              : r.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function rangeToDates(range: RangeKey, customFrom: string, customTo: string): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  if (range === "custom") return { from: customFrom + "T00:00:00", to: customTo + "T23:59:59" };
  if (range === "today") {
    const t = fmt(now);
    return { from: t + "T00:00:00", to: t + "T23:59:59" };
  }
  if (range === "yesterday") {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    const t = fmt(y);
    return { from: t + "T00:00:00", to: t + "T23:59:59" };
  }
  if (range === "week") {
    const start = new Date(now); start.setDate(now.getDate() - now.getDay());
    return { from: fmt(start) + "T00:00:00", to: fmt(now) + "T23:59:59" };
  }
  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: fmt(start) + "T00:00:00", to: fmt(now) + "T23:59:59" };
  }
  if (range === "lastmonth") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmt(start) + "T00:00:00", to: fmt(end) + "T23:59:59" };
  }
  if (range === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    return { from: fmt(start) + "T00:00:00", to: fmt(now) + "T23:59:59" };
  }
  return { from: "", to: "" };
}

// ── Sales Report ──────────────────────────────────────────────────────
function SalesReport({ user, range, customFrom, customTo, onData }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const { from, to } = rangeToDates(range, customFrom, customTo);
    let url = `reports/sales?shopId=${user.shopId}`;
    if (from && to) url += `&from=${from}&to=${to}`;
    cachedFetchAsync(url).then((d: any) => { if (d && !d?.error) { setData(d); onData?.(d); } setLoading(false); });
  }, [range, customFrom, customTo]);

  if (loading && !data) return <ActivityIndicator style={{ padding: 30 }} color={colors.primary} />;
  if (!data) return <Text style={styles.emptyText}>No data</Text>;

  const rows: any[] = data.rows ?? [];
  const cashTotal = rows.filter((r) => r.paymentMethod !== "credit").reduce((s, r) => s + (r.netPay ?? 0), 0);
  const creditTotal = rows.filter((r) => r.paymentMethod === "credit").reduce((s, r) => s + (r.netPay ?? 0), 0);

  return (
    <View>
      {/* Summary cards */}
      <View style={styles.miniCardsRow}>
        <View style={[styles.miniCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.miniCardVal}>Rs.{(data.total ?? 0).toLocaleString()}</Text>
          <Text style={styles.miniCardLabel}>Total Sales</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: "#0D9488" }]}>
          <Text style={styles.miniCardVal}>{rows.length}</Text>
          <Text style={styles.miniCardLabel}>Bills</Text>
        </View>
      </View>
      <View style={styles.miniCardsRow}>
        <View style={[styles.miniCard, { backgroundColor: "#16a34a" }]}>
          <Text style={styles.miniCardVal}>Rs.{cashTotal.toLocaleString()}</Text>
          <Text style={styles.miniCardLabel}>Cash</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: "#EA580C" }]}>
          <Text style={styles.miniCardVal}>Rs.{creditTotal.toLocaleString()}</Text>
          <Text style={styles.miniCardLabel}>Credit</Text>
        </View>
      </View>

      {/* Sales table */}
      {rows.length > 0 && (
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.thCell, { flex: 1.2 }]}>Date</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Bill No.</Text>
            <Text style={[styles.thCell, { flex: 1, textAlign: "right" }]}>Amount</Text>
            <Text style={[styles.thCell, { flex: 0.8, textAlign: "center" }]}>Type</Text>
          </View>
          {rows.map((s: any, i: number) => (
            <View key={s.id ?? i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
              <Text style={[styles.tdCell, { flex: 1.2 }]}>{formatDate(s.createdAt ?? s.created_at)}</Text>
              <Text style={[styles.tdCell, { flex: 1 }]}>{(s.billNumber ?? s.bill_number ?? "").replace("BILL-", "")}</Text>
              <Text style={[styles.tdCell, { flex: 1, textAlign: "right", fontWeight: "700", color: colors.primary }]}>
                Rs.{(s.netPay ?? s.net_pay ?? 0).toLocaleString()}
              </Text>
              <View style={[styles.listActionCell, { flex: 0.8 }]}>
                <View style={[styles.badge, { backgroundColor: s.paymentMethod !== "credit" ? "#dcfce7" : "#fff7ed" }]}>
                  <Text style={[styles.badgeText, { color: s.paymentMethod !== "credit" ? "#16a34a" : "#EA580C" }]}>
                    {s.paymentMethod ?? "cash"}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
      {rows.length === 0 && <Text style={styles.emptyText}>No sales in this period</Text>}
    </View>
  );
}

// ── Item Sales Report ─────────────────────────────────────────────────
function ItemSalesReport({ user, range, customFrom, customTo, onData }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const { from, to } = rangeToDates(range, customFrom, customTo);
    let url = `reports/item-sales?shopId=${user.shopId}`;
    if (from && to) url += `&from=${from}&to=${to}`;
    cachedFetchAsync(url).then((d: any) => { if (d && !d?.error) { setData(d); onData?.(d); } setLoading(false); });
  }, [range, customFrom, customTo]);

  if (loading && !data) return <ActivityIndicator style={{ padding: 30 }} color={colors.primary} />;
  const rows: any[] = data?.rows ?? [];
  if (!rows.length) return <Text style={styles.emptyText}>No data</Text>;

  return (
    <View style={styles.tableCard}>
      <View style={styles.tableHeader}>
        <Text style={[styles.thCell, { flex: 1.2 }]}>Date</Text>
        <Text style={[styles.thCell, { flex: 1.5 }]}>Item</Text>
        <Text style={[styles.thCell, { flex: 0.6, textAlign: "center" }]}>Qty</Text>
        <Text style={[styles.thCell, { flex: 1, textAlign: "right" }]}>Amount</Text>
      </View>
      {rows.map((r: any, i: number) => (
        <View key={i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
          <Text style={[styles.tdCell, { flex: 1.2 }]}>{formatDate(r.created_at ?? r.createdAt)}</Text>
          <Text style={[styles.tdCell, { flex: 1.5 }]} numberOfLines={1}>{r.item_name ?? r.itemName}</Text>
          <Text style={[styles.tdCell, { flex: 0.6, textAlign: "center", fontWeight: "700" }]}>{r.qty}</Text>
          <Text style={[styles.tdCell, { flex: 1, textAlign: "right", fontWeight: "700", color: colors.primary }]}>
            Rs.{Number(r.total ?? 0).toLocaleString()}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── Items Report ──────────────────────────────────────────────────────
function ItemsReport({ user, range, customFrom, customTo, onData }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const { from, to } = rangeToDates(range, customFrom, customTo);
    let url = `reports/items?shopId=${user.shopId}`;
    if (from && to) url += `&from=${from}&to=${to}`;
    cachedFetchAsync(url).then((d: any) => { if (d && !d?.error) { setData(d); onData?.(d); } setLoading(false); });
  }, [range, customFrom, customTo]);

  if (loading && !data) return <ActivityIndicator style={{ padding: 30 }} color={colors.primary} />;
  const rows: any[] = data?.rows ?? [];
  if (!rows.length) return <Text style={styles.emptyText}>No data</Text>;

  return (
    <View>
      <View style={styles.miniCardsRow}>
        <View style={[styles.miniCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.miniCardVal}>{data.totalQty ?? 0}</Text>
          <Text style={styles.miniCardLabel}>Total Items Sold</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: "#7C3AED" }]}>
          <Text style={styles.miniCardVal}>{rows.length}</Text>
          <Text style={styles.miniCardLabel}>Unique Products</Text>
        </View>
      </View>
      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.thCell, { flex: 2 }]}>Item</Text>
          <Text style={[styles.thCell, { flex: 0.8, textAlign: "center" }]}>Qty</Text>
          <Text style={[styles.thCell, { flex: 1, textAlign: "right" }]}>Total</Text>
        </View>
        {rows.map((r: any, i: number) => (
          <View key={i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
            <Text style={[styles.tdCell, { flex: 2 }]} numberOfLines={1}>{r.item_name ?? r.itemName}</Text>
            <Text style={[styles.tdCell, { flex: 0.8, textAlign: "center", fontWeight: "700" }]}>{r.total_qty ?? r.totalQty}</Text>
            <Text style={[styles.tdCell, { flex: 1, textAlign: "right", fontWeight: "700", color: colors.primary }]}>
              Rs.{Number(r.total_amount ?? r.totalRevenue ?? 0).toLocaleString()}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Credit Sales Report ───────────────────────────────────────────────
function CreditSalesReport({ user, range, customFrom, customTo, onData }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const { from, to } = rangeToDates(range, customFrom, customTo);
    let url = `reports/credit-sales?shopId=${user.shopId}`;
    if (from && to) url += `&from=${from}&to=${to}`;
    cachedFetchAsync(url).then((d: any) => { if (d && !d?.error) { setData(d); onData?.(d); } setLoading(false); });
  }, [range, customFrom, customTo]);

  if (loading && !data) return <ActivityIndicator style={{ padding: 30 }} color={colors.primary} />;
  const rows: any[] = data?.rows ?? [];
  if (!rows.length) return <Text style={styles.emptyText}>No credit sales</Text>;

  return (
    <View>
      <View style={styles.miniCardsRow}>
        <View style={[styles.miniCard, { backgroundColor: "#EA580C" }]}>
          <Text style={styles.miniCardVal}>Rs.{(data.totalCredit ?? 0).toLocaleString()}</Text>
          <Text style={styles.miniCardLabel}>Total Credit</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: "#16a34a" }]}>
          <Text style={styles.miniCardVal}>Rs.{(data.totalCollected ?? 0).toLocaleString()}</Text>
          <Text style={styles.miniCardLabel}>Collected</Text>
        </View>
      </View>
      <View style={[styles.miniCardsRow, { paddingTop: 0 }]}>
        <View style={[styles.miniCard, { backgroundColor: "#e53935", flex: 1 }]}>
          <Text style={styles.miniCardVal}>Rs.{(data.totalOutstanding ?? 0).toLocaleString()}</Text>
          <Text style={styles.miniCardLabel}>Outstanding</Text>
        </View>
      </View>
      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.thCell, { flex: 1.5 }]}>Customer</Text>
          <Text style={[styles.thCell, { flex: 1, textAlign: "right" }]}>Amount</Text>
          <Text style={[styles.thCell, { flex: 1, textAlign: "right" }]}>Balance</Text>
        </View>
        {rows.map((s: any, i: number) => {
          const netPay = s.netPay ?? s.net_pay ?? 0;
          const collected = s.collectedAmount ?? s.collected_amount ?? 0;
          const bal = netPay - collected;
          return (
            <View key={s.id ?? i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
              <View style={{ flex: 1.5 }}>
                <Text style={[styles.tdCell, { fontWeight: "600" }]} numberOfLines={1}>
                  {s.customerName ?? s.customer_name ?? "—"}
                </Text>
                {(s.promisedDate ?? s.promised_date) ? (
                  <Text style={{ fontSize: 10, color: "#888" }}>Due: {s.promisedDate ?? s.promised_date}</Text>
                ) : null}
              </View>
              <Text style={[styles.tdCell, { flex: 1, textAlign: "right" }]}>Rs.{netPay.toLocaleString()}</Text>
              <Text style={[styles.tdCell, { flex: 1, textAlign: "right", fontWeight: "700", color: bal > 0 ? "#e53935" : "#16a34a" }]}>
                Rs.{bal.toLocaleString()}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Collections Report ────────────────────────────────────────────────
function CollectionsReport({ user, range, customFrom, customTo, onData }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const { from, to } = rangeToDates(range, customFrom, customTo);
    let url = `reports/collections?shopId=${user.shopId}`;
    if (from && to) url += `&from=${from}&to=${to}`;
    cachedFetchAsync(url).then((d: any) => { if (d && !d?.error) { setData(d); onData?.(d); } setLoading(false); });
  }, [range, customFrom, customTo]);

  if (loading && !data) return <ActivityIndicator style={{ padding: 30 }} color={colors.primary} />;
  const rows: any[] = data?.rows ?? [];
  if (!rows.length) return <Text style={styles.emptyText}>No collections</Text>;

  return (
    <View>
      <View style={styles.miniCardsRow}>
        <View style={[styles.miniCard, { backgroundColor: "#16a34a" }]}>
          <Text style={styles.miniCardVal}>Rs.{(data.total ?? 0).toLocaleString()}</Text>
          <Text style={styles.miniCardLabel}>Total Collected</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: "#0D9488" }]}>
          <Text style={styles.miniCardVal}>{rows.length}</Text>
          <Text style={styles.miniCardLabel}>Payments</Text>
        </View>
      </View>
      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.thCell, { flex: 1.2 }]}>Date</Text>
          <Text style={[styles.thCell, { flex: 1.5 }]}>Customer</Text>
          <Text style={[styles.thCell, { flex: 1, textAlign: "right" }]}>Amount</Text>
        </View>
        {rows.map((c: any, i: number) => (
          <View key={c.id ?? i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
            <Text style={[styles.tdCell, { flex: 1.2 }]}>{formatDate(c.created_at ?? c.createdAt)}</Text>
            <Text style={[styles.tdCell, { flex: 1.5 }]} numberOfLines={1}>{c.customer_name ?? c.customerName ?? "—"}</Text>
            <Text style={[styles.tdCell, { flex: 1, textAlign: "right", fontWeight: "700", color: "#16a34a" }]}>
              Rs.{Number(c.amount ?? 0).toLocaleString()}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}


function StaffSalesReport({ user, range, customFrom, customTo, onData }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const { from, to } = rangeToDates(range, customFrom, customTo);
    let url = `reports/staff-sales?shopId=${user.shopId}`;
    if (from && to) url += `&from=${from}&to=${to}`;
    cachedFetchAsync(url).then((d: any) => { if (d && !d?.error) { setData(d); onData?.(d); } setLoading(false); });
  }, [range, customFrom, customTo]);

  if (loading && !data) return <ActivityIndicator style={{ padding: 30 }} color={colors.primary} />;
  const rows: any[] = data?.rows ?? [];
  if (!rows.length) return <Text style={styles.emptyText}>No staff sales data</Text>;

  return (
    <View>
      <View style={styles.miniCardsRow}>
        <View style={[styles.miniCard, { backgroundColor: "#1976D2" }]}>
          <Text style={styles.miniCardVal}>Rs.{(data.grandTotal ?? 0).toLocaleString()}</Text>
          <Text style={styles.miniCardLabel}>Grand Total</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: "#7C3AED" }]}>
          <Text style={styles.miniCardVal}>{rows.length}</Text>
          <Text style={styles.miniCardLabel}>Staff Members</Text>
        </View>
      </View>
      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.thCell, { flex: 1.8 }]}>Staff</Text>
          <Text style={[styles.thCell, { flex: 0.7, textAlign: "center" }]}>Bills</Text>
          <Text style={[styles.thCell, { flex: 1.2, textAlign: "right" }]}>Total</Text>
        </View>
        {rows.map((r: any, i: number) => (
          <View key={r.userId ?? i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
            <View style={{ flex: 1.8 }}>
              <Text style={[styles.tdCell, { fontWeight: "700" }]}>{r.name}</Text>
              <Text style={{ fontSize: 10, color: "#888", paddingHorizontal: 4, textTransform: "capitalize" }}>{r.role}</Text>
            </View>
            <Text style={[styles.tdCell, { flex: 0.7, textAlign: "center" }]}>{r.count}</Text>
            <Text style={[styles.tdCell, { flex: 1.2, textAlign: "right", fontWeight: "700", color: "#1976D2" }]}>
              Rs.{Number(r.total ?? 0).toLocaleString()}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Thermal Print Report ──────────────────────────────────────────────
function buildReportText(tab: ReportTab, data: any, range: string, shopName: string, paperWidth: string): string {
  const ESC = "\x1B";
  const GS = "\x1D";
  const RESET = `${ESC}@`;
  const BOLD_ON = `${ESC}E\x01`;
  const BOLD_OFF = `${ESC}E\x00`;
  const ALIGN_CENTER = `${ESC}a\x01`;
  const ALIGN_LEFT = `${ESC}a\x00`;
  const SIZE_NORMAL = `${GS}!\x00`;
  const SIZE_2X = `${GS}!\x11`;
  const is80 = paperWidth === "80mm";
  const colWidth = is80 ? 48 : 32;
  const SEP_HEAVY = "=".repeat(colWidth);
  const SEP_LIGHT = "-".repeat(colWidth);
  const pad = is80 ? 24 : 16;

  const tabLabel: Record<ReportTab, string> = {
    sales: "SALES REPORT", itemsales: "ITEM SALES REPORT", items: "ITEMS REPORT",
    creditsales: "CREDIT SALES REPORT", collections: "COLLECTIONS REPORT", staffsales: "STAFF SALES REPORT",
  };

  const now = new Date();
  const dateStr = `${now.getDate().toString().padStart(2,"0")}.${(now.getMonth()+1).toString().padStart(2,"0")}.${now.getFullYear()}`;

  let t = RESET + ALIGN_CENTER;
  t += SIZE_2X + BOLD_ON + shopName + "\n" + BOLD_OFF + SIZE_NORMAL;
  t += tabLabel[tab] + "\n";
  t += `Period: ${range}\n`;
  t += `Date: ${dateStr}\n`;
  t += ALIGN_LEFT + SEP_HEAVY + "\n";

  if (tab === "sales") {
    const rows: any[] = data?.rows ?? [];
    const total = data?.total ?? 0;
    const cash = rows.filter(r => r.paymentMethod !== "credit").reduce((s: number, r: any) => s + (r.netPay ?? 0), 0);
    const credit = rows.filter(r => r.paymentMethod === "credit").reduce((s: number, r: any) => s + (r.netPay ?? 0), 0);
    t += BOLD_ON + "Total Sales:".padEnd(pad) + `Rs.${total.toLocaleString()}` + BOLD_OFF + "\n";
    t += "Cash:".padEnd(pad) + `Rs.${cash.toLocaleString()}\n`;
    t += "Credit:".padEnd(pad) + `Rs.${credit.toLocaleString()}\n`;
    t += "Bills:".padEnd(pad) + `${rows.length}\n`;
    if (rows.length > 0) {
      t += SEP_LIGHT + "\n";
      const bw = is80 ? 8 : 6;
      const aw = is80 ? 12 : 8;
      const tw = colWidth - bw - aw - 2;
      t += "Bill".padEnd(bw) + "Type".padEnd(tw) + "Amount".padStart(aw) + "\n";
      t += SEP_LIGHT + "\n";
      rows.forEach((r: any) => {
        const bill = (r.billNumber ?? "").replace("BILL-","").slice(0, bw).padEnd(bw);
        const type = (r.paymentMethod ?? "cash").slice(0, tw).padEnd(tw);
        const amt = `Rs.${(r.netPay ?? 0).toLocaleString()}`.padStart(aw);
        t += bill + type + amt + "\n";
      });
    }
  } else if (tab === "itemsales") {
    const rows: any[] = data?.rows ?? [];
    if (rows.length > 0) {
      const nw = is80 ? 22 : 14;
      const qw = 5;
      const aw = colWidth - nw - qw - 1;
      t += "Item".padEnd(nw) + "Qty".padEnd(qw) + "Amt".padStart(aw) + "\n";
      t += SEP_LIGHT + "\n";
      rows.forEach((r: any) => {
        const name = (r.item_name ?? r.itemName ?? "").slice(0, nw).padEnd(nw);
        const qty = String(r.qty ?? "").padEnd(qw);
        const amt = `Rs.${Number(r.total ?? 0).toLocaleString()}`.padStart(aw);
        t += name + qty + amt + "\n";
      });
    }
  } else if (tab === "items") {
    const rows: any[] = data?.rows ?? [];
    t += BOLD_ON + "Total Qty:".padEnd(pad) + `${data?.totalQty ?? 0}` + BOLD_OFF + "\n";
    t += "Products:".padEnd(pad) + `${rows.length}\n`;
    if (rows.length > 0) {
      t += SEP_LIGHT + "\n";
      const nw = is80 ? 24 : 14;
      const qw = 6;
      const aw = colWidth - nw - qw - 1;
      t += "Item".padEnd(nw) + "Qty".padEnd(qw) + "Total".padStart(aw) + "\n";
      t += SEP_LIGHT + "\n";
      rows.forEach((r: any) => {
        const name = (r.item_name ?? r.itemName ?? "").slice(0, nw).padEnd(nw);
        const qty = String(r.total_qty ?? r.totalQty ?? "").padEnd(qw);
        const amt = `Rs.${Number(r.total_amount ?? r.totalRevenue ?? 0).toLocaleString()}`.padStart(aw);
        t += name + qty + amt + "\n";
      });
    }
  } else if (tab === "creditsales") {
    const rows: any[] = data?.rows ?? [];
    t += BOLD_ON + "Total Credit:".padEnd(pad) + `Rs.${(data?.totalCredit ?? 0).toLocaleString()}` + BOLD_OFF + "\n";
    t += "Collected:".padEnd(pad) + `Rs.${(data?.totalCollected ?? 0).toLocaleString()}\n`;
    t += "Outstanding:".padEnd(pad) + `Rs.${(data?.totalOutstanding ?? 0).toLocaleString()}\n`;
    if (rows.length > 0) {
      t += SEP_LIGHT + "\n";
      const nw = is80 ? 18 : 12;
      const aw = is80 ? 15 : 10;
      const bw = colWidth - nw - aw - 1;
      t += "Customer".padEnd(nw) + "Amount".padEnd(aw) + "Balance".padStart(bw) + "\n";
      t += SEP_LIGHT + "\n";
      rows.forEach((s: any) => {
        const np = s.netPay ?? s.net_pay ?? 0;
        const col = s.collectedAmount ?? s.collected_amount ?? 0;
        const bal = np - col;
        const name = (s.customerName ?? s.customer_name ?? "—").slice(0, nw).padEnd(nw);
        const amt = `Rs.${np.toLocaleString()}`.padEnd(aw);
        const balStr = `Rs.${bal.toLocaleString()}`.padStart(bw);
        t += name + amt + balStr + "\n";
      });
    }
  } else if (tab === "collections") {
    const rows: any[] = data?.rows ?? [];
    t += BOLD_ON + "Total Collected:".padEnd(pad) + `Rs.${(data?.total ?? 0).toLocaleString()}` + BOLD_OFF + "\n";
    t += "Payments:".padEnd(pad) + `${rows.length}\n`;
    if (rows.length > 0) {
      t += SEP_LIGHT + "\n";
      const dw = is80 ? 10 : 8;
      const nw = is80 ? 18 : 12;
      const aw = colWidth - dw - nw - 2;
      t += "Date".padEnd(dw) + "Customer".padEnd(nw) + "Amt".padStart(aw) + "\n";
      t += SEP_LIGHT + "\n";
      rows.forEach((c: any) => {
        const date = formatDate(c.created_at ?? c.createdAt).padEnd(dw);
        const name = (c.customer_name ?? c.customerName ?? "—").slice(0, nw).padEnd(nw);
        const amt = `Rs.${Number(c.amount ?? 0).toLocaleString()}`.padStart(aw);
        t += date + name + amt + "\n";
      });
    }
  } else if (tab === "staffsales") {
    const rows: any[] = data?.rows ?? [];
    t += BOLD_ON + "Grand Total:".padEnd(pad) + `Rs.${(data?.grandTotal ?? 0).toLocaleString()}` + BOLD_OFF + "\n";
    t += "Staff Members:".padEnd(pad) + `${rows.length}\n`;
    if (rows.length > 0) {
      t += SEP_LIGHT + "\n";
      const nw = is80 ? 22 : 14;
      const cw = 5;
      const aw = colWidth - nw - cw - 1;
      t += "Staff".padEnd(nw) + "Bills".padEnd(cw) + "Total".padStart(aw) + "\n";
      t += SEP_LIGHT + "\n";
      rows.forEach((r: any) => {
        const name = (r.name ?? "—").slice(0, nw).padEnd(nw);
        const cnt = String(r.count ?? 0).padEnd(cw);
        const amt = `Rs.${Number(r.total ?? 0).toLocaleString()}`.padStart(aw);
        t += name + cnt + amt + "\n";
      });
    }
  }

  t += SEP_HEAVY + "\n";
  t += ALIGN_CENTER + "ATOM POS by AxisXNOR\n\n\n";
  return t;
}

// ── PDF Export ────────────────────────────────────────────────────────
function buildPdfHtml(tab: ReportTab, data: any, range: string, shopName: string): string {
  const tabLabel: Record<ReportTab, string> = {
    sales: "Sales Report", itemsales: "Item Sales Report", items: "Items Report",
    creditsales: "Credit Sales Report", collections: "Collections Report", staffsales: "Staff Sales Report",
  };
  const title = tabLabel[tab] ?? "Report";
  const now = new Date().toLocaleDateString("en-GB");

  const baseStyle = `
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 24px; }
    h1 { font-size: 18px; margin: 0 0 2px; color: #1d4ed8; }
    .meta { font-size: 11px; color: #555; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #1d4ed8; color: #fff; padding: 7px 8px; text-align: left; font-size: 11px; }
    td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
    tr:nth-child(even) td { background: #f8fafc; }
    .right { text-align: right; }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .summary { display: flex; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
    .card { background: #1d4ed8; color: #fff; border-radius: 8px; padding: 10px 16px; min-width: 120px; }
    .card.green { background: #16a34a; }
    .card.orange { background: #EA580C; }
    .card.teal { background: #0D9488; }
    .card.red { background: #e53935; }
    .card.purple { background: #7C3AED; }
    .cv { font-size: 16px; font-weight: 700; }
    .cl { font-size: 10px; opacity: 0.85; margin-top: 2px; }
  `;

  let body = "";

  if (tab === "sales") {
    const rows: any[] = data?.rows ?? [];
    const total = data?.total ?? 0;
    const cash = rows.filter(r => r.paymentMethod !== "credit").reduce((s, r) => s + (r.netPay ?? 0), 0);
    const credit = rows.filter(r => r.paymentMethod === "credit").reduce((s, r) => s + (r.netPay ?? 0), 0);
    body += `<div class="summary">
      <div class="card"><div class="cv">Rs.${total.toLocaleString()}</div><div class="cl">Total Sales</div></div>
      <div class="card teal"><div class="cv">${rows.length}</div><div class="cl">Bills</div></div>
      <div class="card green"><div class="cv">Rs.${cash.toLocaleString()}</div><div class="cl">Cash</div></div>
      <div class="card orange"><div class="cv">Rs.${credit.toLocaleString()}</div><div class="cl">Credit</div></div>
    </div>`;
    body += `<table><tr><th>Date</th><th>Bill No.</th><th class="right">Amount</th><th class="center">Type</th></tr>`;
    rows.forEach(s => {
      body += `<tr><td>${formatDate(s.createdAt ?? s.created_at)}</td><td>${(s.billNumber ?? s.bill_number ?? "").replace("BILL-", "")}</td>
        <td class="right bold" style="color:#1d4ed8">Rs.${(s.netPay ?? s.net_pay ?? 0).toLocaleString()}</td>
        <td class="center">${s.paymentMethod ?? "cash"}</td></tr>`;
    });
    body += `</table>`;
  } else if (tab === "itemsales") {
    const rows: any[] = data?.rows ?? [];
    body += `<table><tr><th>Date</th><th>Item</th><th class="center">Qty</th><th class="right">Amount</th></tr>`;
    rows.forEach(r => {
      body += `<tr><td>${formatDate(r.created_at ?? r.createdAt)}</td><td>${r.item_name ?? r.itemName}</td>
        <td class="center bold">${r.qty}</td>
        <td class="right bold" style="color:#1d4ed8">Rs.${Number(r.total ?? 0).toLocaleString()}</td></tr>`;
    });
    body += `</table>`;
  } else if (tab === "items") {
    const rows: any[] = data?.rows ?? [];
    body += `<div class="summary">
      <div class="card"><div class="cv">${data?.totalQty ?? 0}</div><div class="cl">Total Items Sold</div></div>
      <div class="card purple"><div class="cv">${rows.length}</div><div class="cl">Unique Products</div></div>
    </div>`;
    body += `<table><tr><th>Item</th><th class="center">Qty</th><th class="right">Total</th></tr>`;
    rows.forEach(r => {
      body += `<tr><td>${r.item_name ?? r.itemName}</td>
        <td class="center bold">${r.total_qty ?? r.totalQty}</td>
        <td class="right bold" style="color:#1d4ed8">Rs.${Number(r.total_amount ?? r.totalRevenue ?? 0).toLocaleString()}</td></tr>`;
    });
    body += `</table>`;
  } else if (tab === "creditsales") {
    const rows: any[] = data?.rows ?? [];
    body += `<div class="summary">
      <div class="card orange"><div class="cv">Rs.${(data?.totalCredit ?? 0).toLocaleString()}</div><div class="cl">Total Credit</div></div>
      <div class="card green"><div class="cv">Rs.${(data?.totalCollected ?? 0).toLocaleString()}</div><div class="cl">Collected</div></div>
      <div class="card red"><div class="cv">Rs.${(data?.totalOutstanding ?? 0).toLocaleString()}</div><div class="cl">Outstanding</div></div>
    </div>`;
    body += `<table><tr><th>Customer</th><th class="right">Amount</th><th class="right">Balance</th><th>Due Date</th></tr>`;
    rows.forEach(s => {
      const np = s.netPay ?? s.net_pay ?? 0;
      const col = s.collectedAmount ?? s.collected_amount ?? 0;
      const bal = np - col;
      body += `<tr><td>${s.customerName ?? s.customer_name ?? "—"}</td>
        <td class="right">Rs.${np.toLocaleString()}</td>
        <td class="right bold" style="color:${bal > 0 ? "#e53935" : "#16a34a"}">Rs.${bal.toLocaleString()}</td>
        <td>${s.promisedDate ?? s.promised_date ?? "—"}</td></tr>`;
    });
    body += `</table>`;
  } else if (tab === "collections") {
    const rows: any[] = data?.rows ?? [];
    body += `<div class="summary">
      <div class="card green"><div class="cv">Rs.${(data?.total ?? 0).toLocaleString()}</div><div class="cl">Total Collected</div></div>
      <div class="card teal"><div class="cv">${rows.length}</div><div class="cl">Payments</div></div>
    </div>`;
    body += `<table><tr><th>Date</th><th>Customer</th><th class="right">Amount</th></tr>`;
    rows.forEach(c => {
      body += `<tr><td>${formatDate(c.created_at ?? c.createdAt)}</td>
        <td>${c.customer_name ?? c.customerName ?? "—"}</td>
        <td class="right bold" style="color:#16a34a">Rs.${Number(c.amount ?? 0).toLocaleString()}</td></tr>`;
    });
    body += `</table>`;
  } else if (tab === "staffsales") {
    const rows: any[] = data?.rows ?? [];
    body += `<div class="summary">
      <div class="card"><div class="cv">Rs.${(data?.grandTotal ?? 0).toLocaleString()}</div><div class="cl">Grand Total</div></div>
      <div class="card purple"><div class="cv">${rows.length}</div><div class="cl">Staff Members</div></div>
    </div>`;
    body += `<table><tr><th>Staff</th><th>Role</th><th class="center">Bills</th><th class="right">Cash</th><th class="right">Credit</th><th class="right">Total</th></tr>`;
    rows.forEach((r: any) => {
      body += `<tr><td class="bold">${r.name ?? "—"}</td>
        <td style="text-transform:capitalize">${r.role ?? "—"}</td>
        <td class="center">${r.count ?? 0}</td>
        <td class="right">Rs.${Number(r.cashTotal ?? 0).toLocaleString()}</td>
        <td class="right">Rs.${Number(r.creditTotal ?? 0).toLocaleString()}</td>
        <td class="right bold" style="color:#1d4ed8">Rs.${Number(r.total ?? 0).toLocaleString()}</td></tr>`;
    });
    body += `</table>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseStyle}</style></head><body>
    <h1>${shopName}</h1>
    <div class="meta">${title} &nbsp;|&nbsp; Period: ${range} &nbsp;|&nbsp; Generated: ${now}</div>
    ${body}
    <div style="margin-top:24px;font-size:10px;color:#aaa;text-align:center">ATOM POS by AxisXNOR</div>
  </body></html>`;
}

function formatDate(val: any): string {
  if (!val) return "—";
  const d = val instanceof Date ? val : new Date(typeof val === "number" ? val * 1000 : val);
  if (isNaN(d.getTime())) return String(val);
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const yy = d.getFullYear().toString().slice(2);
  return `${dd}.${mm}.${yy}`;
}

// ── Main Reports Screen ───────────────────────────────────────────────
export default function ReportsScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ReportTab>("sales");
  const [range, setRange] = useState<RangeKey>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [pendingFrom, setPendingFrom] = useState("");
  const [pendingTo, setPendingTo] = useState("");
  const [reportData, setReportData] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printerSettings, setPrinterSettings] = useState<{
    printerEnabled: boolean; printerType: "bluetooth" | "wifi";
    printerAddress: string; wifiHost: string; wifiPort: string; paperWidth: string;
  }>({ printerEnabled: false, printerType: "bluetooth", printerAddress: "", wifiHost: "", wifiPort: "9100", paperWidth: "80mm" });

  const load = async () => {
    const u = await getUser();
    setUser(u);
    if (u?.shopId) {
      try {
        const s = await cachedFetchAsync(`settings/${u.shopId}`);
        if (s && !s.error) {
          setPrinterSettings({
            printerEnabled: !!s.printerEnabled,
            printerType: (s.printerType as "bluetooth" | "wifi") ?? "bluetooth",
            printerAddress: s.printerAddress ?? "",
            wifiHost: s.wifiHost ?? "",
            wifiPort: s.wifiPort ?? "9100",
            paperWidth: s.paperWidth ?? "80mm",
          });
        }
      } catch (_) {}
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useFocusEffect(useCallback(() => { load(); }, []));

  const selectRange = (r: RangeKey) => {
    if (r === "custom") {
      const today = new Date().toISOString().slice(0, 10);
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

  const exportPdf = async () => {
    if (!reportData) { Alert.alert("No data", "Load the report first."); return; }
    try {
      setExporting(true);
      const rangeLabel = range === "custom" ? `${customFrom} to ${customTo}` : range;
      const html = buildPdfHtml(activeTab, reportData, rangeLabel, user?.shopName ?? "");
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Export Report" });
    } catch (e: any) {
      Alert.alert("Export failed", e?.message ?? "Could not export PDF.");
    } finally {
      setExporting(false);
    }
  };

  const printReport = async () => {
    if (!reportData) { Alert.alert("No data", "Load the report first."); return; }
    if (!printerSettings.printerEnabled) { Alert.alert("Printer disabled", "Enable printer in Settings."); return; }
    try {
      setPrinting(true);
      const rangeLabel = range === "custom" ? `${customFrom} to ${customTo}` : range;
      const text = buildReportText(activeTab, reportData, rangeLabel, user?.shopName ?? "", printerSettings.paperWidth);
      if (printerSettings.printerType === "bluetooth") {
        if (!printerSettings.printerAddress) { Alert.alert("No Printer", "Select a Bluetooth printer in Settings."); return; }
        await BLEPrinter.init();
        await BLEPrinter.connectPrinter(printerSettings.printerAddress);
        await BLEPrinter.printText(text);
      } else {
        if (!printerSettings.wifiHost) { Alert.alert("No IP", "Enter printer IP in Settings."); return; }
        await NetPrinter.init();
        await NetPrinter.connectPrinter(printerSettings.wifiHost, parseInt(printerSettings.wifiPort || "9100"));
        await NetPrinter.printText(text);
      }
    } catch (e: any) {
      Alert.alert("Print Error", e?.message ?? "Could not print.");
    } finally {
      setPrinting(false);
    }
  };

  // Only show full-screen spinner on absolute first load (no user yet)
  if (!user && loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={{ padding: 16, gap: 10 }}>
          <View style={styles.skeletonTabBar} />
          <View style={styles.skeletonBlock} />
          <View style={styles.skeletonBlock} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {/* Top Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScrollBar} contentContainerStyle={styles.tabScrollContent}>
        {REPORT_TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
            onPress={() => { setActiveTab(t.key); setReportData(null); }}
          >
            <Ionicons name={t.icon as any} size={15} color={activeTab === t.key ? "#fff" : colors.textSecondary} />
            <Text style={[styles.tabBtnText, activeTab === t.key && styles.tabBtnTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }}>
        {/* Range selector + Export/Print buttons */}
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <RangeSelector range={range} customFrom={customFrom} customTo={customTo} onSelect={selectRange} />
          </View>
          <TouchableOpacity
            onPress={exportPdf}
            disabled={exporting}
            style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, opacity: exporting ? 0.6 : 1 }}
          >
            <Ionicons name="document-text-outline" size={15} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{exporting ? "..." : "PDF"}</Text>
          </TouchableOpacity>
          {printerSettings.printerEnabled && (
            <TouchableOpacity
              onPress={printReport}
              disabled={printing}
              style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#0D9488", paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, opacity: printing ? 0.6 : 1 }}
            >
              <Ionicons name="print-outline" size={15} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{printing ? "..." : "Print"}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Report content */}
        <View style={{ padding: spacing.md, paddingTop: spacing.sm }}>
          {activeTab === "sales" && <SalesReport user={user} range={range} customFrom={customFrom} customTo={customTo} onData={setReportData} />}
          {activeTab === "itemsales" && <ItemSalesReport user={user} range={range} customFrom={customFrom} customTo={customTo} onData={setReportData} />}
          {activeTab === "items" && <ItemsReport user={user} range={range} customFrom={customFrom} customTo={customTo} onData={setReportData} />}
          {activeTab === "creditsales" && <CreditSalesReport user={user} range={range} customFrom={customFrom} customTo={customTo} onData={setReportData} />}
          {activeTab === "collections" && <CollectionsReport user={user} range={range} customFrom={customFrom} customTo={customTo} onData={setReportData} />}
          {activeTab === "staffsales" && <StaffSalesReport user={user} range={range} customFrom={customFrom} customTo={customTo} onData={setReportData} />}
        </View>
      </ScrollView>

      {/* Custom Date Modal */}
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Skeleton
  skeletonTabBar: { height: 44, borderRadius: 22, backgroundColor: "#e8e8e8" },
  skeletonBlock: { height: 120, borderRadius: radius.md, backgroundColor: "#e8e8e8" },
  emptyText: { textAlign: "center", color: colors.textSecondary, fontSize: 13, paddingVertical: 30 },

  // Tab bar
  tabScrollBar: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, flexGrow: 0 },
  tabScrollContent: { flexDirection: "row", paddingHorizontal: spacing.sm, paddingVertical: 8, gap: 6 },
  tabBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: "#fff",
  },
  tabBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabBtnText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  tabBtnTextActive: { color: "#fff" },

  // Range
  rangeScroll: { flexGrow: 0, marginBottom: 4 },
  rangeRow: { flexDirection: "row", gap: 6, paddingVertical: 2 },
  rangeChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: "#ddd", backgroundColor: "#fff",
  },
  rangeChipActive: { borderColor: colors.primary, backgroundColor: "#f0fff0" },
  rangeChipText: { fontSize: 12, fontWeight: "600", color: "#666" },
  rangeChipTextActive: { color: "#2e7d32", fontWeight: "700" },

  // Mini cards
  miniCardsRow: { flexDirection: "row", gap: 10, paddingBottom: 10 },
  miniCard: {
    flex: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  miniCardVal: { fontSize: 18, fontWeight: "800", color: "#fff" },
  miniCardLabel: { fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 2 },

  // Table
  tableCard: {
    backgroundColor: colors.white, borderRadius: radius.md,
    overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  tableHeader: {
    flexDirection: "row", backgroundColor: "#f5f5f5",
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: "#e0e0e0",
  },
  thCell: { fontSize: 11, fontWeight: "700", color: "#555" },
  tableRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 9, alignItems: "center" },
  tableRowAlt: { backgroundColor: "#fafafa" },
  tdCell: { fontSize: 12, color: "#333" },
  listActionCell: { alignItems: "center" },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },

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
