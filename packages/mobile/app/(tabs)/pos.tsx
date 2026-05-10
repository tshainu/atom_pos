import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, FlatList, Modal, Alert, ActivityIndicator, Dimensions, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getUser } from "../../lib/auth";
import { apiFetch } from "../../lib/api";
import { colors, spacing, radius } from "../../lib/theme";

const { width } = Dimensions.get("window");

interface PriceGroup { id: number; label: string; price: number; }
interface Item { id: number; name: string; category: string; iconUrl?: string | null; priceGroups: PriceGroup[]; }
interface BillItem { itemId: number; itemName: string; qty: number; pricePerItem: number; total: number; }

const ITEM_ICONS: Record<string, string> = {
  Shirts: "shirt-outline", Tshirts: "shirt-outline", Pants: "body-outline",
  Belts: "ellipsis-horizontal-circle-outline", Accessories: "watch-outline",
  default: "shirt-outline",
};

export default function POSScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [bill, setBill] = useState<BillItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [now, setNow] = useState(new Date());

  // Qty/Price modal
  const [qtyModal, setQtyModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalQty, setModalQty] = useState(1);
  const [modalPriceGroup, setModalPriceGroup] = useState<PriceGroup | null>(null);
  const [numpadValue, setNumpadValue] = useState("");

  // Payment modal
  const [payModal, setPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<"cash" | "credit">("cash");
  const [cashInput, setCashInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Discount modal
  const [discountModal, setDiscountModal] = useState(false);
  const [discountInput, setDiscountInput] = useState("");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const loadItems = async () => {
    const u = await getUser();
    setUser(u);
    if (!u) return;
    const [itemsData, catsData] = await Promise.all([
      apiFetch(`items?shopId=${u.shopId}`),
      apiFetch(`categories?shopId=${u.shopId}`),
    ]);
    if (!itemsData.error) setItems(itemsData.items);
    if (!catsData.error) {
      setCategories(["All", ...catsData.categories.map((c: { name: string }) => c.name)]);
    } else if (!itemsData.error) {
      // fallback: derive from items
      setCategories(["All", ...Array.from(new Set<string>(itemsData.items.map((i: Item) => i.category)))]);
    }
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, []);

  const filteredItems = activeCategory === "All"
    ? items : items.filter((i) => i.category === activeCategory);

  const openItemModal = (item: Item) => {
    setSelectedItem(item);
    setModalQty(1);
    setModalPriceGroup(item.priceGroups[0] ?? null);
    setNumpadValue("");
    setQtyModal(true);
  };

  const handleNumpad = (key: string) => {
    if (key === "DEL") setNumpadValue((v) => v.slice(0, -1));
    else if (key === ".") { if (!numpadValue.includes(".")) setNumpadValue((v) => v + "."); }
    else setNumpadValue((v) => (v + key).slice(0, 8));
  };

  const addToBill = () => {
    if (!selectedItem || !modalPriceGroup) return;
    const price = numpadValue ? parseFloat(numpadValue) : modalPriceGroup.price;
    const existing = bill.findIndex((b) => b.itemId === selectedItem.id && b.pricePerItem === price);
    if (existing >= 0) {
      const updated = [...bill];
      updated[existing].qty += modalQty;
      updated[existing].total = updated[existing].qty * price;
      setBill(updated);
    } else {
      setBill((b) => [...b, {
        itemId: selectedItem.id, itemName: selectedItem.name,
        qty: modalQty, pricePerItem: price, total: modalQty * price,
      }]);
    }
    setQtyModal(false);
  };

  const removeBillItem = (idx: number) => setBill((b) => b.filter((_, i) => i !== idx));

  const subtotal = bill.reduce((s, b) => s + b.total, 0);
  const netPay = Math.max(0, subtotal - discount);
  const cashGiven = parseFloat(cashInput) || 0;
  const change = cashGiven - netPay;

  const submitSale = async () => {
    if (bill.length === 0) { Alert.alert("Empty Bill", "Add items first"); return; }
    setSubmitting(true);
    try {
      const data = await apiFetch("sales", {
        method: "POST",
        body: JSON.stringify({
          shopId: user.shopId, userId: user.id,
          subtotal, discount, netPay, paymentMethod: payMethod, items: bill,
        }),
      });
      if (data.error) { Alert.alert("Error", data.error); return; }
      Alert.alert("Success", `Bill #${data.sale.billNumber} saved!`, [
        { text: "New Bill", onPress: () => { setBill([]); setDiscount(0); setPayModal(false); } },
      ]);
    } catch { Alert.alert("Error", "Failed to save bill"); }
    finally { setSubmitting(false); }
  };

  const formatDateTime = (d: Date) => {
    const dd = d.getDate().toString().padStart(2, "0");
    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = d.getHours().toString().padStart(2, "0");
    const min = d.getMinutes().toString().padStart(2, "0");
    return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* ── Category tabs ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={{ paddingHorizontal: 10, gap: 8 }}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.catTab, activeCategory === cat && styles.catTabActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.catTabText, activeCategory === cat && styles.catTabTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Item grid ── */}
      <FlatList
        data={filteredItems}
        keyExtractor={(i) => i.id.toString()}
        numColumns={3}
        style={styles.grid}
        contentContainerStyle={{ padding: 8, gap: 8 }}
        columnWrapperStyle={{ gap: 8 }}
        renderItem={({ item }) => {
          const iconName = (ITEM_ICONS[item.category] ?? ITEM_ICONS.default) as any;
          return (
            <TouchableOpacity style={styles.itemCard} onPress={() => openItemModal(item)}>
              <View style={styles.itemIconBox}>
                {item.iconUrl ? (
                  <Image source={{ uri: item.iconUrl }} style={styles.itemIconImg} />
                ) : (
                  <Ionicons name={iconName} size={26} color={colors.primary} />
                )}
              </View>
              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.itemPrice}>Rs.{item.priceGroups[0]?.price.toLocaleString() ?? "—"}</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No items found. Add items from Items Management.</Text>
        }
      />

      {/* ── Billing Area ── */}
      <View style={styles.billingArea}>
        <View style={styles.billingTitleRow}>
          <Text style={styles.billingTitle}>─────  Billing Area  ─────</Text>
        </View>

        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.thCell, { flex: 0.4 }]}>No</Text>
          <Text style={[styles.thCell, { flex: 2 }]}>Item</Text>
          <Text style={[styles.thCell, { flex: 1, textAlign: "right" }]}>Price</Text>
          <Text style={[styles.thCell, { flex: 0.7, textAlign: "center" }]}>Qty</Text>
          <Text style={[styles.thCell, { flex: 1, textAlign: "right" }]}>Total</Text>
        </View>

        {/* Bill rows */}
        <ScrollView style={styles.tableBody} nestedScrollEnabled>
          {bill.length === 0 ? (
            <Text style={styles.emptyBill}>Tap items above to add to bill</Text>
          ) : (
            bill.map((b, i) => (
              <TouchableOpacity key={i} onLongPress={() => removeBillItem(i)}
                style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.tdCell, { flex: 0.4 }]}>{i + 1}</Text>
                <Text style={[styles.tdCell, { flex: 2 }]} numberOfLines={1}>{b.itemName}</Text>
                <Text style={[styles.tdCell, { flex: 1, textAlign: "right" }]}>{b.pricePerItem}</Text>
                <Text style={[styles.tdCell, { flex: 0.7, textAlign: "center" }]}>{b.qty}</Text>
                <Text style={[styles.tdCell, { flex: 1, textAlign: "right", fontWeight: "700", color: colors.primary }]}>{b.total}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Summary bar */}
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>Total: <Text style={styles.summaryVal}>{subtotal.toLocaleString()}</Text></Text>
          <Text style={styles.summaryText}>Dis: <Text style={styles.summaryVal}>{discount}</Text></Text>
          <Text style={styles.summaryText}>Items: <Text style={styles.summaryVal}>{bill.reduce((s, b) => s + b.qty, 0)}</Text></Text>
          <Text style={styles.summaryNetPay}>Net pay: <Text style={styles.summaryNetVal}>{netPay.toLocaleString()}</Text></Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setBill([])}>
            <Ionicons name="refresh-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setDiscountModal(true)}>
            <Ionicons name="pricetag-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert("Print", "Print not available in demo")}>
            <Ionicons name="print-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.payActionBtn, bill.length === 0 && { opacity: 0.5 }]}
            onPress={() => { if (bill.length > 0) setPayModal(true); }}
          >
            <Ionicons name="card-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert("History", "Bill history coming soon")}>
            <Ionicons name="time-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Qty/Price Modal ── */}
      <Modal visible={qtyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Title */}
            <Text style={styles.modalTitle}>Enter the Quantity and Price</Text>

            {/* Item icon + name + qty stepper */}
            <View style={styles.modalItemRow}>
              <View style={styles.modalItemIconBox}>
                {selectedItem?.iconUrl ? (
                  <Image source={{ uri: selectedItem.iconUrl }} style={styles.itemIconImg} />
                ) : (
                  <Ionicons
                    name={(ITEM_ICONS[selectedItem?.category ?? ""] ?? ITEM_ICONS.default) as any}
                    size={26} color="#E6A817"
                  />
                )}
              </View>
              <Text style={styles.modalItemName}>{selectedItem?.name}</Text>
              <TouchableOpacity onPress={() => setModalQty((q) => Math.max(1, q - 1))}>
                <Ionicons name="remove-circle-outline" size={32} color="#333" />
              </TouchableOpacity>
              <View style={styles.qtyBox}>
                <Text style={styles.qtyBoxText}>{modalQty}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalQty((q) => q + 1)}>
                <Ionicons name="add-circle-outline" size={32} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Two-column price panel */}
            <View style={styles.pricePanelRow}>
              {/* Left: per item + total */}
              <View style={styles.priceLeftPanel}>
                <Text style={styles.pricePanelLabel}>Per item price</Text>
                <View style={styles.pricePanelBox}>
                  <Text style={styles.pricePanelVal}>
                    {numpadValue || (modalPriceGroup?.price?.toString() ?? "0")}
                  </Text>
                </View>
                <Text style={[styles.pricePanelLabel, { marginTop: 8 }]}>Total price</Text>
                <View style={[styles.pricePanelBox, { backgroundColor: "#e8e8e8" }]}>
                  <Text style={styles.pricePanelVal}>
                    {(modalQty * (numpadValue ? parseFloat(numpadValue) || 0 : modalPriceGroup?.price ?? 0)).toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* Right: price group chips */}
              <View style={styles.priceRightPanel}>
                <Text style={styles.pricePanelLabel}>Price group</Text>
                <View style={styles.pgChipsGrid}>
                  {(selectedItem?.priceGroups ?? []).map((pg) => (
                    <TouchableOpacity
                      key={pg.id}
                      style={[styles.pgChip, modalPriceGroup?.id === pg.id && styles.pgChipActive]}
                      onPress={() => { setModalPriceGroup(pg); setNumpadValue(""); }}
                    >
                      <Text style={[styles.pgChipText, modalPriceGroup?.id === pg.id && styles.pgChipTextActive]}>
                        {pg.price}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Numpad */}
            <View style={styles.numpad}>
              {["1","2","3","4","5","6","7","8","9",".","0","DEL"].map((k) => (
                <TouchableOpacity key={k} style={styles.numKey} onPress={() => handleNumpad(k)}>
                  <Text style={styles.numKeyText}>{k === "DEL" ? "<<" : k}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Add / Cancel */}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.addBtn} onPress={addToBill}>
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setQtyModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Discount Modal ── */}
      <Modal visible={discountModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: 250 }]}>
            <Text style={styles.modalTitle}>Apply Discount</Text>
            <TextInput
              style={styles.discountField}
              value={discountInput}
              onChangeText={setDiscountInput}
              keyboardType="numeric"
              placeholder="Enter discount amount"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDiscountModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={() => {
                setDiscount(parseFloat(discountInput) || 0);
                setDiscountModal(false);
              }}>
                <Text style={styles.addBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Payment Modal ── */}
      <Modal visible={payModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Complete Payment</Text>

            <View style={styles.payMethodRow}>
              {(["cash", "credit"] as const).map((m) => (
                <TouchableOpacity key={m}
                  style={[styles.payMethodBtn, payMethod === m && styles.payMethodActive]}
                  onPress={() => setPayMethod(m)}>
                  <Ionicons name={m === "cash" ? "cash-outline" : "card-outline"} size={20}
                    color={payMethod === m ? "#fff" : colors.primary} />
                  <Text style={[styles.payMethodText, payMethod === m && { color: "#fff" }]}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.paySummary}>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>Subtotal</Text>
                <Text style={styles.sumVal}>Rs.{subtotal.toLocaleString()}</Text>
              </View>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>Discount</Text>
                <Text style={styles.sumVal}>Rs.{discount}</Text>
              </View>
              <View style={[styles.sumRow, styles.netRow]}>
                <Text style={styles.netLabel}>Net Pay</Text>
                <Text style={styles.netVal}>Rs.{netPay.toLocaleString()}</Text>
              </View>
              {payMethod === "cash" && (
                <>
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLabel}>Cash Given</Text>
                    <TextInput
                      style={styles.cashInput}
                      value={cashInput}
                      onChangeText={setCashInput}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  {cashGiven >= netPay && cashInput !== "" && (
                    <View style={styles.sumRow}>
                      <Text style={styles.sumLabel}>Change</Text>
                      <Text style={[styles.sumVal, { color: colors.success }]}>Rs.{change.toLocaleString()}</Text>
                    </View>
                  )}
                </>
              )}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPayModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtn, submitting && { opacity: 0.6 }]}
                onPress={submitSale} disabled={submitting}>
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.addBtnText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Header
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8,
  },
  headerTitle: { fontSize: 16, fontWeight: "900", color: "#fff", letterSpacing: 1 },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 1 },
  headerShop: { fontSize: 11, fontWeight: "700", color: "#fff" },
  headerTime: { fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 1 },

  // Categories
  catScroll: { maxHeight: 44, paddingVertical: 6, backgroundColor: "#fff" },
  catTab: {
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
    backgroundColor: "#f0f0f0", borderWidth: 1, borderColor: "#e0e0e0",
  },
  catTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catTabText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  catTabTextActive: { color: "#fff" },

  // Item grid
  grid: { flex: 1, backgroundColor: colors.bg },
  itemCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 10, padding: 8,
    alignItems: "center", borderWidth: 1, borderColor: "#e8e8e8",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  itemIconBox: {
    width: 48, height: 48, borderRadius: 10,
    backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: 5,
    overflow: "hidden",
  },
  itemIconImg: { width: 48, height: 48, borderRadius: 10 },
  itemName: { fontSize: 11, fontWeight: "600", color: "#333", textAlign: "center", marginBottom: 2 },
  itemPrice: { fontSize: 11, fontWeight: "700", color: colors.primary },
  emptyText: { textAlign: "center", color: colors.textSecondary, fontSize: 12, padding: 20 },

  // Billing area
  billingArea: { backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e0e0e0" },
  billingTitleRow: { alignItems: "center", paddingVertical: 4 },
  billingTitle: { fontSize: 11, color: colors.textSecondary, letterSpacing: 1 },

  tableHeader: {
    flexDirection: "row", backgroundColor: "#f5f5f5",
    paddingHorizontal: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#e0e0e0",
  },
  thCell: { fontSize: 11, fontWeight: "700", color: "#555" },

  tableBody: { maxHeight: 143 },
  tableRow: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 4 },
  tableRowAlt: { backgroundColor: "#fafafa" },
  tdCell: { fontSize: 11, color: "#333" },
  emptyBill: { textAlign: "center", color: "#aaa", fontSize: 11, paddingVertical: 12 },

  // Summary bar
  summaryBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 6,
    borderTopWidth: 1, borderTopColor: "#d0eeeb",
  },
  summaryText: { fontSize: 11, color: "#444" },
  summaryVal: { fontWeight: "700", color: "#333" },
  summaryNetPay: { fontSize: 12, color: colors.primary },
  summaryNetVal: { fontWeight: "800", color: colors.primary },

  // Action bar
  actionBar: {
    flexDirection: "row", backgroundColor: colors.primary,
    paddingVertical: 6, paddingHorizontal: 10, gap: 8, justifyContent: "space-around",
  },
  actionBtn: {
    flex: 1, height: 42, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  payActionBtn: { backgroundColor: "#007A6E" },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 16, maxHeight: "94%",
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#222", marginBottom: 12, textAlign: "center" },
  modalLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 },

  // Item row (icon + name + stepper)
  modalItemRow: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12,
    backgroundColor: "#f9f9f9", borderRadius: 12, padding: 10,
  },
  modalItemIconBox: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: "#fff8e1", alignItems: "center", justifyContent: "center",
  },
  modalItemName: { flex: 1, fontSize: 15, fontWeight: "700", color: "#222" },
  qtyBox: {
    minWidth: 40, height: 36, borderWidth: 1.5, borderColor: "#ccc",
    borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 8,
  },
  qtyBoxText: { fontSize: 18, fontWeight: "700", color: "#222" },

  // Two-column price panel
  pricePanelRow: {
    flexDirection: "row", gap: 10, marginBottom: 12,
    borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 10,
  },
  priceLeftPanel: { flex: 1 },
  pricePanelLabel: { fontSize: 11, color: "#888", marginBottom: 4 },
  pricePanelBox: {
    backgroundColor: "#f0f0f0", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10,
    marginBottom: 4,
  },
  pricePanelVal: { fontSize: 20, fontWeight: "700", color: "#222" },
  priceRightPanel: { flex: 1.4 },
  pgChipsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  pgChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1.5, borderColor: colors.primary, backgroundColor: "#fff",
  },
  pgChipActive: { backgroundColor: colors.primary },
  pgChipText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  pgChipTextActive: { color: "#fff" },

  // Numpad
  numpad: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  numKey: {
    width: (width - 32 - 24) / 3, paddingVertical: 13,
    backgroundColor: "#f5f5f5", borderRadius: 10, alignItems: "center",
    borderWidth: 1, borderColor: "#e0e0e0",
  },
  numKeyText: { fontSize: 17, fontWeight: "600", color: "#333" },

  // Modal buttons
  modalBtns: { flexDirection: "row", gap: 12 },
  addBtn: { flex: 1, paddingVertical: 13, backgroundColor: colors.primary, borderRadius: 10, alignItems: "center" },
  addBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    backgroundColor: "#e53935", alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  discountField: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 12, fontSize: 16, marginBottom: 20, color: colors.textPrimary,
  },
  payMethodRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  payMethodBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: colors.primary,
  },
  payMethodActive: { backgroundColor: colors.primary },
  payMethodText: { fontSize: 14, fontWeight: "700", color: colors.primary },
  paySummary: { backgroundColor: colors.bg, borderRadius: 10, padding: 14, marginBottom: 16 },
  sumRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  sumLabel: { fontSize: 13, color: colors.textSecondary },
  sumVal: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  netRow: {
    backgroundColor: colors.primaryLight, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 6, marginTop: 4,
  },
  netLabel: { fontSize: 14, fontWeight: "800", color: colors.primary },
  netVal: { fontSize: 16, fontWeight: "900", color: colors.primary },
  cashInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, fontSize: 13, width: 90, textAlign: "right",
    color: colors.textPrimary,
  },
});
