import { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, FlatList, Modal, Alert, ActivityIndicator,
  Dimensions, Image, RefreshControl, Linking, Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getUser } from "../../lib/auth";
import { apiFetch, cachedFetchAsync } from "../../lib/api";
import { cacheInvalidate } from "../../lib/cache";
import { colors } from "../../lib/theme";
import { bleConnectAndPrint, buildReceiptText, buildRawBase64 } from "../../lib/rawPrint";
// Printer lib loaded lazily inside print functions to avoid startup crash
const getPrinter = () => require("react-native-thermal-receipt-printer-image-qr");
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const { width } = Dimensions.get("window");

const SHOP_NAME = "Pandora Fashion";
const BORDER_COLORS = ["#00BCD4","#E91E63","#FF9800","#4CAF50","#FFD600","#9C27B0","#FF5722","#2196F3"];

interface PriceGroup { id: number; label: string; price: number; }
interface Item { id: number; name: string; category: string; iconUrl?: string | null; priceGroups: PriceGroup[]; }
interface BillItem { itemId: number; itemName: string; qty: number; pricePerItem: number; total: number; }
interface HeldBill {
  id: number; billNumber: string; subtotal: number; discount: number; netPay: number;
  heldLabel?: string | null; createdAt: any; items: BillItem[];
}
interface RecentBill {
  id: number; billNumber: string; netPay: number; paymentMethod: string;
  billType: string; customerName?: string | null; createdAt: any;
  cashPaid?: number | null; customerPhone?: string | null;
}

const CATEGORY_ICONS: Record<string, any> = {
  Shirts:      require("../../assets/icons/shirt.png"),
  Tshirts:     require("../../assets/icons/tshirt.png"),
  Pants:       require("../../assets/icons/pants.png"),
  Belts:       require("../../assets/icons/belt.png"),
  Accessories: require("../../assets/icons/accessories.png"),
  default:     require("../../assets/icons/shirt.png"),
};

const TAB_COLORS = ["#4CAF50","#00BCD4","#E91E63","#FF9800","#9C27B0","#2196F3","#FF5722","#FFD600"];

export default function POSScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [bill, setBill] = useState<BillItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [now, setNow] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Qty/Price modal
  const [qtyModal, setQtyModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalQty, setModalQty] = useState("1");
  const [modalPriceGroup, setModalPriceGroup] = useState<PriceGroup | null>(null);
  const [numpadValue, setNumpadValue] = useState("");

  // Quick Bill (Bill Item) modal
  const [quickBillModal, setQuickBillModal] = useState(false);
  const [quickAmount, setQuickAmount] = useState("");
  const [quickItemName, setQuickItemName] = useState("Sale of item");

  // Discount modal
  const [discountModal, setDiscountModal] = useState(false);
  const [discountInput, setDiscountInput] = useState("");

  // Print/Pay modal
  const [printModal, setPrintModal] = useState(false);
  const [printPayMethod, setPrintPayMethod] = useState<"cash" | "card">("cash");
  const [staffList, setStaffList] = useState<{ id: number; fullName: string }[]>([]);
  const [selectedSoldBy, setSelectedSoldBy] = useState<number | null>(null);
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);
  const [printCashInput, setPrintCashInput] = useState("");
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [creditName, setCreditName] = useState("");
  const [creditPhone, setCreditPhone] = useState("");
  const [creditDate, setCreditDate] = useState("");
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [dpYear, setDpYear] = useState(new Date().getFullYear());
  const [dpMonth, setDpMonth] = useState(new Date().getMonth() + 1);
  const [dpDay, setDpDay] = useState(new Date().getDate());
  const [submitting, setSubmitting] = useState(false);

  // Partial payment → due customer modal
  const [dueModal, setDueModal] = useState(false);
  const [dueName, setDueName] = useState("");
  const [duePhone, setDuePhone] = useState("");
  const [pendingReceiptData, setPendingReceiptData] = useState<any>(null);

  // Receipt modal
  const [receiptModal, setReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    billNumber: string;
    items: BillItem[];
    subtotal: number;
    discount: number;
    netPay: number;
    paymentMethod: string;
    cashPaid: number;
    balance: number;
    isCredit: boolean;
    customerName?: string;
    customerPhone?: string;
    creditDate?: string;
    shopName: string;
    shopAddress: string;
    shopPhone: string;
    whatsappPhone?: string;
    printedAt: string;
    logoUrl?: string;
    receiptHeader?: string;
  } | null>(null);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [printerSettings, setPrinterSettings] = useState<{
    printerEnabled: boolean; printerType: "bluetooth" | "wifi";
    printerAddress: string; wifiHost: string; wifiPort: string;
    paperWidth: string; receiptHeader: string; receiptFooter: string; logoUrl: string;
  }>({ printerEnabled: false, printerType: "bluetooth", printerAddress: "", wifiHost: "", wifiPort: "9100", paperWidth: "80mm", receiptHeader: "", receiptFooter: "", logoUrl: "" });

  // Hold modal
  const [holdModal, setHoldModal] = useState(false);
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [loadingHeld, setLoadingHeld] = useState(false);

  // Recent bills modal
  const [recentModal, setRecentModal] = useState(false);
  const [recentBills, setRecentBills] = useState<RecentBill[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [viewItemsModal, setViewItemsModal] = useState(false);
  const [viewItemsBill, setViewItemsBill] = useState<RecentBill | null>(null);
  const [viewItemsList, setViewItemsList] = useState<any[]>([]);
  const [loadingViewItems, setLoadingViewItems] = useState(false);
  const [reprintingId, setReprintingId] = useState<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const applyData = (itemsData: any, catsData: any, settingsData: any) => {
    if (itemsData && !itemsData.error) setItems(itemsData.items ?? []);
    if (catsData && !catsData.error) {
      setCategories(["All", ...catsData.categories.map((c: { name: string }) => c.name)]);
    } else if (itemsData && !itemsData.error) {
      setCategories(["All", ...Array.from(new Set<string>((itemsData.items ?? []).map((i: Item) => i.category)))]);
    }
    if (settingsData && !settingsData.error && settingsData?.settings) {
      const s = settingsData.settings;
      if (s.whatsappPhone) setWhatsappPhone(s.whatsappPhone);
      setPrinterSettings({
        printerEnabled: !!s.printerEnabled,
        printerType: (s.printerType as "bluetooth" | "wifi") ?? "bluetooth",
        printerAddress: s.printerAddress ?? "",
        wifiHost: s.wifiHost ?? "",
        wifiPort: s.wifiPort ?? "9100",
        paperWidth: s.paperWidth ?? "80mm",
        receiptHeader: s.receiptHeader ?? "",
        receiptFooter: s.receiptFooter ?? "",
        logoUrl: s.logoUrl ?? "",
      });
    }
  };

  const loadItems = async (force = false) => {
    const u = await getUser();
    setUser(u);
    if (!u) { setLoading(false); return; }

    if (force) {
      // Force-refresh: invalidate cache and fetch fresh
      cacheInvalidate(`items?shopId=${u.shopId}`);
      cacheInvalidate(`categories?shopId=${u.shopId}`);
      cacheInvalidate(`settings/${u.shopId}`);
    }

    const [itemsData, catsData, settingsData] = await Promise.all([
      cachedFetchAsync(`items?shopId=${u.shopId}`),
      cachedFetchAsync(`categories?shopId=${u.shopId}`),
      cachedFetchAsync(`settings/${u.shopId}`),
    ]);

    applyData(itemsData, catsData, settingsData);
    setLoading(false);
  };

  // On first mount — load with cache (no white screen)
  useEffect(() => { loadItems(); }, []);

  // On tab focus — silently refresh in background if cache is stale
  // We pass force=false so it uses stale-while-revalidate, not a full reload
  useFocusEffect(useCallback(() => { loadItems(false); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadItems(true); // force fresh on pull-to-refresh
    setRefreshing(false);
  };

  const filteredItems = (activeCategory === "All" ? items : items.filter((i) => i.category === activeCategory))
    .filter((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const openItemModal = (item: Item) => {
    setSelectedItem(item);
    setModalQty("1");
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
    const qty = parseFloat(modalQty) || 1;
    if (existing >= 0) {
      const updated = [...bill];
      updated[existing].qty += qty;
      updated[existing].total = updated[existing].qty * price;
      setBill(updated);
    } else {
      setBill((b) => [...b, {
        itemId: selectedItem.id, itemName: selectedItem.name,
        qty, pricePerItem: price, total: qty * price,
      }]);
    }
    setQtyModal(false);
  };

  const removeBillItem = (idx: number) => setBill((b) => b.filter((_, i) => i !== idx));

  const subtotal = bill.reduce((s, b) => s + b.total, 0);
  const netPay = Math.max(0, subtotal - discount);
  const printCash = parseFloat(printCashInput) || 0;
  const printChange = printCash - netPay;

  // ── PDF Bill Generator ───────────────────────────────────
  const generateBillPDF = async (rd: typeof receiptData) => {
    if (!rd) return;
    const itemRows = rd.items.map((it, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${it.itemName}</td>
        <td style="text-align:center">${it.qty}</td>
        <td style="text-align:right">Rs.${it.pricePerItem.toLocaleString()}</td>
        <td style="text-align:right"><b>Rs.${it.total.toLocaleString()}</b></td>
      </tr>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>
      body{font-family:monospace;font-size:13px;margin:0;padding:16px;color:#111}
      h2{text-align:right;margin:4px 0;font-size:18px}
      .sub{text-align:right;font-size:12px;color:#555;margin:2px 0}
      .sep{border-top:1px dashed #999;margin:8px 0}
      .meta{display:flex;justify-content:space-between;font-size:11px;color:#555}
      table{width:100%;border-collapse:collapse;margin:4px 0}
      th{text-align:left;font-size:11px;border-bottom:1px solid #ccc;padding:3px 2px}
      td{padding:3px 2px;font-size:12px}
      .totals{margin-top:6px}
      .totals tr td:first-child{color:#555}
      .totals tr td:last-child{text-align:right;font-weight:bold}
      .netpay td{font-size:15px;color:#000;border-top:2px solid #000;padding-top:4px}
      .credit{background:#FFF3E0;padding:6px;border-radius:4px;margin-top:6px;font-size:12px}
      .footer{text-align:center;margin-top:12px;font-size:11px;color:#888}
    </style></head><body>
    <h2>${rd.shopName}</h2>
    ${rd.shopAddress ? `<p class="sub">${rd.shopAddress}</p>` : ""}
    ${rd.shopPhone ? `<p class="sub">${rd.shopPhone}</p>` : ""}
    <div class="sep"></div>
    <div class="meta">
      <span>Bill: <b>${rd.billNumber}</b></span>
      <span>${rd.printedAt}</span>
      <span>${rd.isCredit ? "Credit" : rd.paymentMethod.charAt(0).toUpperCase() + rd.paymentMethod.slice(1)}</span>
    </div>
    <div class="sep"></div>
    <table>
      <thead><tr><th>#</th><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div class="sep"></div>
    <table class="totals">
      <tr><td>Subtotal</td><td>Rs.${rd.subtotal.toLocaleString()}</td></tr>
      ${rd.discount > 0 ? `<tr><td>Discount</td><td style="color:#e53935">- Rs.${rd.discount.toLocaleString()}</td></tr>` : ""}
      <tr class="netpay"><td><b>Net Pay</b></td><td><b>Rs.${rd.netPay.toLocaleString()}</b></td></tr>
      ${!rd.isCredit ? `
        <tr><td>Total Paid</td><td>Rs.${rd.cashPaid.toLocaleString()}</td></tr>
        <tr><td>Balance</td><td style="color:${rd.balance >= 0 ? "#16a34a" : "#e53935"}">Rs.${Math.abs(rd.balance).toLocaleString()}</td></tr>
      ` : ""}
    </table>
    ${rd.isCredit ? `
    <div class="credit">
      <b>⚠ CREDIT SALE</b><br/>
      Customer: <b>${rd.customerName ?? ""}</b><br/>
      ${rd.customerPhone ? `Phone: ${rd.customerPhone}<br/>` : ""}
      ${rd.creditDate ? `Promised Date: <b>${rd.creditDate}</b>` : ""}
    </div>` : (rd.paymentMethod === "part" && rd.customerName ? `
    <div class="credit" style="background:#FFF8E1;border-left:3px solid #D97706;">
      <b>⚠ PARTIAL PAYMENT</b><br/>
      Customer: <b>${rd.customerName}</b><br/>
      ${rd.customerPhone ? `Phone: ${rd.customerPhone}<br/>` : ""}
      Balance Due: <b>Rs.${Math.abs(rd.balance ?? 0).toLocaleString()}</b>
    </div>` : "")}
    <div class="sep"></div>
    <div class="footer">Thank you! Come again<br/>ATOM POS by AxisXNOR</div>
    </body></html>`;
    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: `Bill ${rd.billNumber}` });
      } else {
        Alert.alert("Sharing not available", "PDF saved to: " + uri);
      }
    } catch (e: any) {
      Alert.alert("PDF Error", e?.message || "Could not generate PDF");
    }
  };

  // ── Quick Bill Save ──────────────────────────────────────
  const saveQuickBill = async (andPrint: boolean) => {
    const amount = parseFloat(quickAmount);
    if (!amount || amount <= 0) { Alert.alert("Error", "Enter a valid amount"); return; }

    const snapshotName = quickItemName.trim() || "Sale of item";
    const snapshotAmount = amount;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const printedAt = `${pad(now.getDate())}.${pad(now.getMonth()+1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    if (andPrint) {
      // Optimistic: show receipt immediately
      setReceiptData({
        billNumber: "...",
        items: [{ itemId: 0, itemName: snapshotName, qty: 1, pricePerItem: snapshotAmount, total: snapshotAmount }],
        subtotal: snapshotAmount,
        discount: 0,
        netPay: snapshotAmount,
        paymentMethod: "cash",
        cashPaid: snapshotAmount,
        balance: 0,
        isCredit: false,
        shopName: user?.shopName ?? "",
        shopAddress: user?.shopAddress ?? "",
        shopPhone: user?.shopPhone ?? "",
        whatsappPhone,
        printedAt,
      });
      setQuickBillModal(false);
      setReceiptModal(true);
      setQuickAmount("");
      setQuickItemName("Sale of item");
    }

    setSubmitting(true);
    try {
      const data = await apiFetch("sales", {
        method: "POST",
        body: JSON.stringify({
          shopId: user.shopId, userId: user.id,
          billType: "quick",
          subtotal: snapshotAmount, discount: 0, netPay: snapshotAmount,
          paymentMethod: "cash",
          status: "completed",
          items: [{ itemId: 0, itemName: snapshotName, qty: 1, pricePerItem: snapshotAmount, total: snapshotAmount }],
        }),
      });
      if (data.error) { Alert.alert("Error", data.error); return; }
      if (user?.shopId) {
        cacheInvalidate(`reports/summary?shopId=${user.shopId}`);
        cacheInvalidate(`reports/today?shopId=${user.shopId}`);
        cacheInvalidate(`sales/recent?shopId=${user.shopId}`);
      }
      if (andPrint) {
        setReceiptData((prev) => prev ? { ...prev, billNumber: data.sale.billNumber } : prev);
      } else {
        Alert.alert("Saved", `Bill #${data.sale.billNumber} saved!`, [
          { text: "OK", onPress: () => { setQuickBillModal(false); setQuickAmount(""); setQuickItemName("Sale of item"); } },
        ]);
      }
    } catch { Alert.alert("Error", "Failed to save"); }
    finally { setSubmitting(false); }
  };

  // ── Print Bill Save ──────────────────────────────────────
  const submitPrintBill = async (isCreditSale: boolean) => {
    if (bill.length === 0) { Alert.alert("Empty Bill", "Add items first"); return; }
    if (isCreditSale && !creditName.trim()) { Alert.alert("Error", "Customer name is required"); return; }
    if (isCreditSale && !creditPhone.trim()) { Alert.alert("Error", "Contact number is required"); return; }

    // Capture all state NOW before clearing
    const snapshotBill = [...bill];
    const snapshotSubtotal = subtotal;
    const snapshotDiscount = discount;
    const snapshotNetPay = netPay;
    const snapshotCreditName = creditName;
    const snapshotCreditPhone = creditPhone;
    const snapshotCreditDate = creditDate;
    const snapshotPayMethod = printPayMethod;

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const printedAt = `${pad(now.getDate())}.${pad(now.getMonth()+1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    // Fix: if no amount entered, treat as fully paid (cashPaid = netPay, balance = 0)
    const enteredCash = parseFloat(printCashInput);
    const cashPaid = isCreditSale ? 0 : (isNaN(enteredCash) || enteredCash === 0 ? snapshotNetPay : enteredCash);
    const balance = isCreditSale ? 0 : cashPaid - snapshotNetPay;

    // Optimistic: show receipt immediately, save in background
    const optimisticReceipt = {
      billNumber: "...",
      items: snapshotBill,
      subtotal: snapshotSubtotal,
      discount: snapshotDiscount,
      netPay: snapshotNetPay,
      paymentMethod: isCreditSale ? "credit" : snapshotPayMethod,
      cashPaid,
      balance,
      isCredit: isCreditSale,
      customerName: isCreditSale ? snapshotCreditName : undefined,
      customerPhone: isCreditSale ? snapshotCreditPhone : undefined,
      creditDate: isCreditSale ? snapshotCreditDate : undefined,
      shopName: user?.shopName ?? "",
      shopAddress: user?.shopAddress ?? "",
      shopPhone: user?.shopPhone ?? "",
      whatsappPhone,
      printedAt,
      logoUrl: printerSettings.logoUrl ?? "",
      receiptHeader: printerSettings.receiptHeader ?? "",
    };

    // If partial payment (cash paid < net pay, not a credit sale) → ask for due customer info
    const isPartialPayment = !isCreditSale && cashPaid > 0 && cashPaid < snapshotNetPay;
    if (isPartialPayment) {
      setPendingReceiptData(optimisticReceipt);
      setDueName("");
      setDuePhone("");
      setPrintModal(false);
      setBill([]); setDiscount(0);
      setPrintCashInput(""); setShowCreditForm(false);
      setCreditName(""); setCreditPhone(""); setCreditDate("");
      setDueModal(true);
    } else {
      setReceiptData(optimisticReceipt);
      setPrintModal(false);
      setReceiptModal(true);
      setBill([]); setDiscount(0);
      setPrintCashInput(""); setShowCreditForm(false);
      setCreditName(""); setCreditPhone(""); setCreditDate("");
    }

    // For partial payment, save is handled after due modal is dismissed/confirmed
    if (!isPartialPayment) {
      try {
        const data = await apiFetch("sales", {
          method: "POST",
          body: JSON.stringify({
            shopId: user.shopId, userId: user.id, soldBy: selectedSoldBy ?? user.id,
            billType: "normal",
            subtotal: snapshotSubtotal, discount: snapshotDiscount, netPay: snapshotNetPay,
            paymentMethod: isCreditSale ? "credit" : snapshotPayMethod,
            status: "completed",
            customerName: isCreditSale ? snapshotCreditName : null,
            customerPhone: isCreditSale ? snapshotCreditPhone : null,
            promisedDate: isCreditSale ? snapshotCreditDate : null,
            items: snapshotBill,
          }),
        });
        if (!data.error) {
          setReceiptData((prev) => prev ? { ...prev, billNumber: data.sale.billNumber } : prev);
          if (user?.shopId) {
            cacheInvalidate(`reports/summary?shopId=${user.shopId}`);
            cacheInvalidate(`reports/today?shopId=${user.shopId}`);
            cacheInvalidate(`reports/sales-chart`);
            cacheInvalidate(`sales/recent?shopId=${user.shopId}`);
          }
        } else {
          Alert.alert("Save Error", data.error);
        }
      } catch { Alert.alert("Save Error", "Bill shown but failed to save. Please retry."); }
    }
  };

  // ── Confirm Due Customer (after partial payment modal) ──
  const confirmDueCustomer = async (rd: any, customerName?: string, customerPhone?: string) => {
    const finalRd = { ...rd, customerName: customerName || undefined, customerPhone: customerPhone || undefined };
    setReceiptData(finalRd);
    setDueModal(false);
    setReceiptModal(true);
    try {
      const data = await apiFetch("sales", {
        method: "POST",
        body: JSON.stringify({
          shopId: user.shopId, userId: user.id, soldBy: selectedSoldBy ?? user.id,
          billType: "normal",
          subtotal: rd.subtotal, discount: rd.discount, netPay: rd.netPay,
          paymentMethod: "part",
          cashPaid: rd.cashPaid,
          status: "completed",
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          items: rd.items,
        }),
      });
      if (!data.error) {
        setReceiptData((prev) => prev ? { ...prev, billNumber: data.sale.billNumber } : prev);
        if (user?.shopId) {
          cacheInvalidate(`reports/summary?shopId=${user.shopId}`);
          cacheInvalidate(`reports/today?shopId=${user.shopId}`);
          cacheInvalidate(`reports/sales-chart`);
          cacheInvalidate(`sales/recent?shopId=${user.shopId}`);
        }
      } else {
        Alert.alert("Save Error", data.error);
      }
    } catch { Alert.alert("Save Error", "Bill shown but failed to save. Please retry."); }
  };

  // ── Hold Bill ────────────────────────────────────────────
  const holdCurrentBill = async () => {
    if (bill.length === 0) { Alert.alert("Empty Bill", "Add items first"); return; }
    setSubmitting(true);
    try {
      const data = await apiFetch("sales", {
        method: "POST",
        body: JSON.stringify({
          shopId: user.shopId, userId: user.id,
          billType: "normal",
          subtotal, discount, netPay,
          paymentMethod: "cash",
          status: "held",
          heldLabel: `Hold ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          items: bill,
        }),
      });
      if (data.error) { Alert.alert("Error", data.error); return; }
      Alert.alert("Bill Held", "Bill saved. Start a new bill.", [
        { text: "OK", onPress: () => { setBill([]); setDiscount(0); setHoldModal(false); } },
      ]);
    } catch { Alert.alert("Error", "Failed to hold bill"); }
    finally { setSubmitting(false); }
  };

  // ── Load Held Bills ──────────────────────────────────────
  const loadHeldBills = async () => {
    if (!user) return;
    setLoadingHeld(true);
    const data = await apiFetch(`sales/held?shopId=${user.shopId}`);
    if (!data.error) setHeldBills(data.sales);
    setLoadingHeld(false);
  };

  const openHoldModal = async () => {
    await loadHeldBills();
    setHoldModal(true);
  };

  const restoreHeldBill = (held: HeldBill) => {
    Alert.alert("Restore Bill", `Restore ${held.billNumber}? This will replace your current bill.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Restore", onPress: async () => {
        // Mark as completed (restored means it's been taken back to active)
        await apiFetch(`sales/${held.id}`, { method: "DELETE" });
        setBill(held.items);
        setDiscount(held.discount);
        setHoldModal(false);
      }},
    ]);
  };

  const deleteHeldBill = async (id: number) => {
    Alert.alert("Delete", "Delete this held bill?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await apiFetch(`sales/${id}`, { method: "DELETE" });
        loadHeldBills();
      }},
    ]);
  };

  // ── Load Recent Bills ────────────────────────────────────
  const loadRecentBills = async () => {
    if (!user) return;
    setLoadingRecent(true);
    const data = await apiFetch(`sales/recent?shopId=${user.shopId}`);
    if (!data.error) setRecentBills(data.sales);
    setLoadingRecent(false);
  };

  const openRecentModal = async () => {
    await loadRecentBills();
    setRecentModal(true);
  };

  const deleteRecentBill = async (id: number) => {
    Alert.alert("Delete", "Delete this bill record?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await apiFetch(`sales/${id}`, { method: "DELETE" });
        loadRecentBills();
      }},
    ]);
  };

  const openViewItems = async (bill: RecentBill) => {
    setViewItemsBill(bill);
    setViewItemsList([]);
    setLoadingViewItems(true);
    setViewItemsModal(true);
    const data = await apiFetch(`sales/${bill.id}/items`);
    if (!data.error) setViewItemsList(data.items);
    setLoadingViewItems(false);
  };

  const reprintRecent = async (r: RecentBill) => {
    setReprintingId(r.id);
    try {
      const data = await apiFetch(`sales/${r.id}/items`);
      if (data.error) { Alert.alert("Error", "Could not load items."); return; }
      const now = new Date();
      const pad2 = (n: number) => n.toString().padStart(2, "0");
      const printedAt = `${pad2(now.getDate())}.${pad2(now.getMonth()+1)}.${now.getFullYear()} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
      const rd = {
        billNumber: r.billNumber,
        items: data.items.map((i: any) => ({
          itemName: i.itemName ?? i.item_name,
          qty: i.qty,
          pricePerItem: i.pricePerItem ?? i.price_per_item ?? (i.qty ? i.total / i.qty : i.total),
          total: i.total,
        })),
        subtotal: data.items.reduce((s: number, i: any) => s + (i.total ?? 0), 0),
        discount: 0,
        netPay: r.netPay,
        paymentMethod: r.paymentMethod,
        cashPaid: r.cashPaid ?? r.netPay,
        balance: (r.cashPaid ?? r.netPay) - r.netPay,
        isCredit: r.billType === "credit",
        customerName: r.customerName,
        customerPhone: r.customerPhone ?? undefined,
        shopName: user?.shopName ?? "",
        shopAddress: user?.shopAddress ?? "",
        shopPhone: user?.shopPhone ?? "",
        printedAt,
        logoUrl: printerSettings.logoUrl ?? "",
      };
      const ps = printerSettings;
      const text = buildReceiptText({
        shopName: rd.shopName,
        shopAddress: rd.shopAddress,
        shopPhone: rd.shopPhone,
        receiptHeader: ps.receiptHeader,
        receiptFooter: ps.receiptFooter,
        paperWidth: ps.paperWidth,
        billNumber: rd.billNumber,
        printedAt: rd.printedAt,
        paymentMethod: rd.paymentMethod,
        isCredit: rd.isCredit,
        customerName: rd.customerName ?? undefined,
        customerPhone: rd.customerPhone,
        creditDate: (rd as any).creditDate,
        items: rd.items,
        subtotal: rd.subtotal,
        discount: rd.discount,
        netPay: rd.netPay,
        cashPaid: rd.cashPaid,
        balance: rd.balance,
      });
      const { BLEPrinter, NetPrinter } = getPrinter();
      const logoUrl = ps.logoUrl ?? "";
      if (ps.printerType === "bluetooth") {
        if (!ps.printerAddress) { Alert.alert("No Printer", "Select a Bluetooth printer in Settings."); return; }
        try {
          await bleConnectAndPrint(BLEPrinter, ps.printerAddress, text, logoUrl);
        } catch (e: any) {
          Alert.alert("Print Failed", e?.message || "Could not print.");
          return;
        }
      } else {
        if (!ps.wifiHost) { Alert.alert("No IP", "Enter printer IP in Settings."); return; }
        try { await NetPrinter.init(); } catch (_) {}
        try {
          await NetPrinter.connectPrinter(ps.wifiHost, parseInt(ps.wifiPort || "9100"));
        } catch (connErr: any) {
          Alert.alert("Connection Failed", connErr?.message || "Could not connect to Wi-Fi printer.");
          return;
        }
        try {
          if (logoUrl) {
            const base64 = logoUrl.includes(",") ? logoUrl.split(",")[1] : logoUrl;
            try { await NetPrinter.printImageBase64(base64, { imageWidth: 200, paddingX: 0 }); } catch (_) {}
          }
          await NetPrinter.printRaw(buildRawBase64(text));
        } catch (printErr: any) {
          Alert.alert("Print Failed", printErr?.message || "Connected but could not print.");
          return;
        }
      }
    } catch (e: any) {
      Alert.alert("Print Error", e?.message || "Could not print.");
    } finally {
      setReprintingId(null);
    }
  };

  const formatDate = (val: any) => {
    const d = val instanceof Date ? val : new Date(typeof val === "number" ? val * 1000 : val);
    if (isNaN(d.getTime())) return "-";
    return `${d.getDate().toString().padStart(2,"0")}.${(d.getMonth()+1).toString().padStart(2,"0")}.${d.getFullYear().toString().slice(2)} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
  };

  const formatDateTime = (d: Date) => {
    const dd = d.getDate().toString().padStart(2, "0");
    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = d.getHours().toString().padStart(2, "0");
    const min = d.getMinutes().toString().padStart(2, "0");
    return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
  };

  if (loading && items.length === 0) {
    // Only show skeleton on true first load (no cache). Once items exist, never show again.
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.skeletonHeader} />
        <View style={styles.skeletonCatRow}>
          {[1,2,3,4].map((i) => <View key={i} style={styles.skeletonCat} />)}
        </View>
        <View style={styles.skeletonGrid}>
          {[1,2,3,4,5,6,7,8,9].map((i) => <View key={i} style={styles.skeletonItem} />)}
        </View>
        <View style={styles.skeletonBillingArea} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerShopName}>{user?.shopName ?? SHOP_NAME}</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search items..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={14} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerStaff}>{user?.name ?? user?.fullName ?? "Staff"}</Text>
          <Text style={styles.headerDateTime}>{formatDateTime(now)}</Text>
        </View>
      </View>

      {/* ── Category tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScroll}
        contentContainerStyle={{ paddingHorizontal: 10, gap: 7, alignItems: "center" }}
      >
        {categories.map((cat, idx) => {
          const isActive = activeCategory === cat;
          const tabColor = TAB_COLORS[idx % TAB_COLORS.length];
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.catTab,
                isActive
                  ? { backgroundColor: tabColor, borderColor: tabColor }
                  : { backgroundColor: "#fff", borderColor: tabColor },
              ]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.catTabText, isActive ? { color: "#fff", fontWeight: "700" } : { color: tabColor, fontWeight: "600" }]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Item grid ── */}
      <FlatList
        data={filteredItems}
        keyExtractor={(i) => i.id.toString()}
        numColumns={3}
        style={styles.grid}
        contentContainerStyle={{ padding: 6, gap: 6 }}
        columnWrapperStyle={{ gap: 6 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const borderColor = BORDER_COLORS[item.id % BORDER_COLORS.length];
          const catIcon = CATEGORY_ICONS[item.category] ?? CATEGORY_ICONS.default;
          return (
            <TouchableOpacity style={[styles.itemCard, { borderColor }]} onPress={() => openItemModal(item)}>
              <View style={[styles.itemIconBox, { backgroundColor: borderColor + "18" }]}>
                {item.iconUrl
                  ? <Image source={{ uri: item.iconUrl }} style={styles.itemIconImg} />
                  : <Image source={catIcon} style={styles.itemIconImg} />}
              </View>
              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>No items found.</Text>}
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
                <Text style={[styles.tdCell, { flex: 1, textAlign: "right" }]}>{Number(b.pricePerItem).toLocaleString()}</Text>
                <Text style={[styles.tdCell, { flex: 0.7, textAlign: "center" }]}>{b.qty}</Text>
                <Text style={[styles.tdCell, { flex: 1, textAlign: "right", fontWeight: "700", color: colors.primary }]}>{Number(b.total).toLocaleString()}</Text>
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

        {/* ── Action buttons (5 icons) ── */}
        <View style={styles.actionBar}>
          {/* 1. Bill Item (quick sale) */}
          <TouchableOpacity style={styles.actionBtn} onPress={() => { setQuickAmount(""); setQuickBillModal(true); }}>
            <Ionicons name="receipt-outline" size={20} color="#fff" />
            <Text style={styles.actionLabel}>Bill Item</Text>
          </TouchableOpacity>

          {/* 2. Discount */}
          <TouchableOpacity style={styles.actionBtn} onPress={() => { setDiscountInput(discount.toString()); setDiscountModal(true); }}>
            <Ionicons name="pricetag-outline" size={20} color="#fff" />
            <Text style={styles.actionLabel}>Discount</Text>
          </TouchableOpacity>

          {/* 3. Print */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.printBtn, bill.length === 0 && { opacity: 0.5 }]}
            onPress={() => { if (bill.length > 0) { setPrintCashInput(""); setShowCreditForm(false); setSelectedSoldBy(user?.id ?? null); setStaffDropdownOpen(false); apiFetch(`users?shopId=${user?.shopId}`).then((d: any) => { if (d?.users) setStaffList(d.users.filter((u: any) => !u.suspended)); }); setPrintModal(true); } }}
          >
            <Ionicons name="print-outline" size={20} color="#fff" />
            <Text style={styles.actionLabel}>Print</Text>
          </TouchableOpacity>

          {/* 4. Hold */}
          <TouchableOpacity style={styles.actionBtn} onPress={openHoldModal}>
            <Ionicons name="pause-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionLabel}>Hold</Text>
          </TouchableOpacity>

          {/* 5. Recent Bill */}
          <TouchableOpacity style={styles.actionBtn} onPress={openRecentModal}>
            <Ionicons name="time-outline" size={20} color="#fff" />
            <Text style={styles.actionLabel}>Recent</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ══════════════════════════════════════════════
          MODAL 1 — Qty/Price (item add)
      ══════════════════════════════════════════════ */}
      <Modal visible={qtyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={styles.modalTitle}>Enter the Quantity and Price</Text>

            <View style={styles.modalItemRow}>
              <View style={styles.modalItemIconBox}>
                {selectedItem?.iconUrl
                  ? <Image source={{ uri: selectedItem.iconUrl }} style={styles.itemIconImg} />
                  : <Image source={CATEGORY_ICONS[selectedItem?.category ?? ""] ?? CATEGORY_ICONS.default} style={styles.itemIconImg} />}
              </View>
              <Text style={styles.modalItemName}>{selectedItem?.name}</Text>
              <TouchableOpacity onPress={() => {
                const v = parseFloat(modalQty) || 1;
                const next = Math.max(0.01, parseFloat((v - 1).toFixed(4)));
                setModalQty(Number.isInteger(next) ? String(next) : String(next));
              }}>
                <Ionicons name="remove-circle-outline" size={32} color="#333" />
              </TouchableOpacity>
              <TextInput
                style={styles.qtyBox}
                value={modalQty}
                onChangeText={(t) => {
                  // allow digits, single dot, leading dot
                  const cleaned = t.replace(/[^0-9.]/g, "");
                  const parts = cleaned.split(".");
                  const safe = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;
                  setModalQty(safe);
                }}
                keyboardType="decimal-pad"
                textAlign="center"
                selectTextOnFocus
                maxLength={8}
              />
              <TouchableOpacity onPress={() => {
                const v = parseFloat(modalQty) || 0;
                setModalQty(String(v + 1));
              }}>
                <Ionicons name="add-circle-outline" size={32} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.pricePanelRow}>
              <View style={styles.priceLeftPanel}>
                <Text style={styles.pricePanelLabel}>Per item price</Text>
                <View style={styles.pricePanelBox}>
                  <Text style={styles.pricePanelVal}>{numpadValue || (modalPriceGroup?.price?.toString() ?? "0")}</Text>
                </View>
                <Text style={[styles.pricePanelLabel, { marginTop: 8 }]}>Total price</Text>
                <View style={[styles.pricePanelBox, { backgroundColor: "#e8e8e8" }]}>
                  <Text style={styles.pricePanelVal}>
                    {((parseFloat(modalQty) || 0) * (numpadValue ? parseFloat(numpadValue) || 0 : modalPriceGroup?.price ?? 0)).toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.priceRightPanel}>
                <Text style={styles.pricePanelLabel}>Price group</Text>
                <View style={styles.pgChipsGrid}>
                  {(selectedItem?.priceGroups ?? []).map((pg) => (
                    <TouchableOpacity key={pg.id}
                      style={[styles.pgChip, modalPriceGroup?.id === pg.id && styles.pgChipActive]}
                      onPress={() => { setModalPriceGroup(pg); setNumpadValue(""); }}>
                      <Text style={[styles.pgChipText, modalPriceGroup?.id === pg.id && styles.pgChipTextActive]}>{pg.price}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.numpad}>
              {["1","2","3","4","5","6","7","8","9",".","0","DEL"].map((k) => (
                <TouchableOpacity key={k} style={styles.numKey} onPress={() => handleNumpad(k)}>
                  <Text style={styles.numKeyText}>{k === "DEL" ? "<<" : k}</Text>
                </TouchableOpacity>
              ))}
            </View>

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

      {/* ══════════════════════════════════════════════
          MODAL 2 — Quick Bill Item
      ══════════════════════════════════════════════ */}
      <Modal visible={quickBillModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "80%", paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={styles.modalTitle}>Bill Items</Text>
            <Text style={styles.quickBillLabel}>Item Name</Text>
            <TextInput
              style={styles.quickItemNameInput}
              value={quickItemName}
              onChangeText={setQuickItemName}
              placeholder="Sale of item"
              placeholderTextColor="#aaa"
              maxLength={60}
            />
            <Text style={styles.quickBillLabel}>Amount</Text>
            <View style={styles.quickAmountBox}>
              <Text style={styles.quickAmountText}>{quickAmount || "0"}</Text>
            </View>

            <View style={styles.numpad}>
              {["1","2","3","4","5","6","7","8","9","DEL","0","."].map((k) => (
                <TouchableOpacity key={k} style={styles.numKey} onPress={() => {
                  if (k === "DEL") setQuickAmount((v) => v.slice(0, -1));
                  else if (k === ".") { if (!quickAmount.includes(".")) setQuickAmount((v) => v + "."); }
                  else setQuickAmount((v) => (v + k).slice(0, 10));
                }}>
                  <Text style={styles.numKeyText}>{k === "DEL" ? "<" : k}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.addBtn, submitting && { opacity: 0.6 }]}
                onPress={() => saveQuickBill(true)} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addBtnText}>Pay & Print</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: "#4CAF50" }, submitting && { opacity: 0.6 }]}
                onPress={() => saveQuickBill(false)} disabled={submitting}>
                <Text style={styles.addBtnText}>Pay Only</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => { setQuickBillModal(false); setQuickAmount(""); setQuickItemName("Sale of item"); }} style={{ marginTop: 10, alignItems: "center" }}>
              <Text style={styles.cancelLink}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════
          MODAL 3 — Discount
      ══════════════════════════════════════════════ */}
      <Modal visible={discountModal} animationType="fade" transparent>
        <View style={styles.modalOverlayCentered}>
          <View style={styles.centeredModalCard}>
            <Text style={styles.modalTitle}>Apply Discount</Text>
            <View style={styles.discountAmountRow}>
              <Text style={styles.discountAmountLabel}>Bill Total</Text>
              <Text style={styles.discountAmountVal}>Rs.{subtotal.toLocaleString()}</Text>
            </View>
            <TextInput
              style={styles.discountField}
              value={discountInput}
              onChangeText={setDiscountInput}
              keyboardType="numeric"
              placeholder="Enter discount amount"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <View style={styles.discountPreview}>
              <Text style={styles.discountPreviewLabel}>Net Pay</Text>
              <Text style={styles.discountPreviewVal}>
                Rs.{Math.max(0, subtotal - (parseFloat(discountInput) || 0)).toLocaleString()}
              </Text>
            </View>
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

      {/* ══════════════════════════════════════════════
          MODAL 4 — Print Bill
      ══════════════════════════════════════════════ */}
      <Modal visible={printModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "90%", paddingBottom: Math.max(insets.bottom, 16) }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Print Bill</Text>



              <Text style={styles.printBillAmount}>
                Total Bill Amount : <Text style={{ color: "#e53935" }}>Rs.{netPay.toLocaleString()}</Text>
              </Text>

              {!showCreditForm ? (
                <>
                  {/* Staff / Salesperson picker */}
                  <Text style={[styles.quickBillLabel, { marginBottom: 6 }]}>Sold By</Text>
                  <TouchableOpacity
                    style={[styles.creditField, { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }]}
                    onPress={() => setStaffDropdownOpen(o => !o)}
                  >
                    <Text style={{ fontSize: 14, color: "#222" }}>
                      {staffList.find(s => s.id === selectedSoldBy)?.fullName ?? "Select staff"}
                    </Text>
                    <Ionicons name={staffDropdownOpen ? "chevron-up" : "chevron-down"} size={16} color="#888" />
                  </TouchableOpacity>
                  {staffDropdownOpen && (
                    <View style={{ borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 8, marginBottom: 14, backgroundColor: "#fff", elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4 }}>
                      {staffList.map(s => (
                        <TouchableOpacity key={s.id}
                          style={{ paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", backgroundColor: selectedSoldBy === s.id ? "#e8f4fd" : "#fff" }}
                          onPress={() => { setSelectedSoldBy(s.id); setStaffDropdownOpen(false); }}
                        >
                          <Text style={{ fontSize: 14, color: selectedSoldBy === s.id ? "#1976D2" : "#222", fontWeight: selectedSoldBy === s.id ? "700" : "400" }}>{s.fullName}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Cash / Card toggle */}
                  <View style={styles.payMethodRow}>
                    {(["cash", "card"] as const).map((m) => (
                      <TouchableOpacity key={m}
                        style={[styles.payMethodBtn, printPayMethod === m && styles.payMethodActive]}
                        onPress={() => setPrintPayMethod(m)}>
                        <Ionicons name={m === "cash" ? "cash-outline" : "card-outline"} size={18}
                          color={printPayMethod === m ? "#fff" : colors.primary} />
                        <Text style={[styles.payMethodText, printPayMethod === m && { color: "#fff" }]}>
                          {m.charAt(0).toUpperCase() + m.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.quickBillLabel}>Amount Paid</Text>
                  <View style={styles.quickAmountBox}>
                    <Text style={styles.quickAmountText}>{printCashInput || "0"}</Text>
                  </View>
                  {printCash > 0 && (
                    <View style={styles.balanceRow}>
                      <Text style={styles.balanceLabel}>Balance :</Text>
                      <Text style={[styles.balanceVal, { color: printChange >= 0 ? "#4CAF50" : "#e53935" }]}>
                        {printChange >= 0 ? `+ ${printChange.toLocaleString()}` : `- ${Math.abs(printChange).toLocaleString()}`}
                      </Text>
                    </View>
                  )}

                  <View style={styles.numpad}>
                    {["1","2","3","4","5","6","7","8","9","DEL","0","."].map((k) => (
                      <TouchableOpacity key={k} style={[styles.numKey, { borderColor: colors.primary + "55" }]}
                        onPress={() => {
                          if (k === "DEL") setPrintCashInput((v) => v.slice(0, -1));
                          else if (k === ".") { if (!printCashInput.includes(".")) setPrintCashInput((v) => v + "."); }
                          else setPrintCashInput((v) => (v + k).slice(0, 10));
                        }}>
                        <Text style={styles.numKeyText}>{k === "DEL" ? "<" : k}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.modalBtns}>
                    <TouchableOpacity style={[styles.addBtn, submitting && { opacity: 0.6 }]}
                      onPress={() => submitPrintBill(false)} disabled={submitting}>
                      {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addBtnText}>Pay & Print</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.addBtn, { backgroundColor: "#4CAF50" }, submitting && { opacity: 0.6 }]}
                      onPress={() => submitPrintBill(false)} disabled={submitting}>
                      <Text style={styles.addBtnText}>Pay Only</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={{ marginTop: 12, alignItems: "center" }}
                    onPress={() => setShowCreditForm(true)}>
                    <Text style={styles.creditSaleLink}>Credit sale</Text>
                  </TouchableOpacity>
                </>
              ) : (
                /* Credit Sale Form */
                <>
                  <View style={styles.creditNoteBox}>
                    <Text style={styles.creditNoteTitle}>Credit sale Note</Text>
                    <TextInput
                      style={styles.creditField}
                      placeholder="Customer Name"
                      placeholderTextColor="#aaa"
                      value={creditName}
                      onChangeText={setCreditName}
                    />
                    <TextInput
                      style={styles.creditField}
                      placeholder="Contact Number"
                      placeholderTextColor="#aaa"
                      value={creditPhone}
                      onChangeText={setCreditPhone}
                      keyboardType="phone-pad"
                    />
                    <View style={styles.creditDateRow}>
                      <Text style={styles.creditDateLabel}>Promised Date:</Text>
                      {Platform.OS === "web" ? (
                        <View style={{ flex: 1 }}>
                          <input
                            type="date"
                            value={creditDate}
                            onChange={(e: any) => setCreditDate(e.target.value)}
                            style={{ border: "1px solid #ccc", borderRadius: 8, padding: "9px 12px", fontSize: 13, width: "100%", boxSizing: "border-box", backgroundColor: "#fff" }}
                          />
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.creditField, { flex: 1, marginBottom: 0, justifyContent: "center" }]}
                          onPress={() => {
                            if (creditDate) {
                              const [y, m, d] = creditDate.split("-").map(Number);
                              if (y) setDpYear(y); if (m) setDpMonth(m); if (d) setDpDay(d);
                            }
                            setDatePickerVisible(true);
                          }}
                        >
                          <Text style={{ fontSize: 14, color: creditDate ? "#222" : "#aaa" }}>
                            {creditDate || "Select date"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <TouchableOpacity style={[styles.addBtn, { marginTop: 12 }, submitting && { opacity: 0.6 }]}
                      onPress={() => submitPrintBill(true)} disabled={submitting}>
                      {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addBtnText}>Save & Print</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowCreditForm(false)} style={{ marginTop: 10, alignItems: "center" }}>
                      <Text style={[styles.creditSaleLink, { color: "#e53935" }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <TouchableOpacity onPress={() => setPrintModal(false)} style={{ marginTop: 8, alignItems: "center" }}>
                <Text style={styles.cancelLink}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════
          MODAL 5 — Hold Bills
      ══════════════════════════════════════════════ */}
      <Modal visible={holdModal} animationType="slide" transparent>
        <View style={styles.modalOverlayCentered}>
          <View style={styles.listModalCard}>
            <TouchableOpacity style={styles.modalCloseX} onPress={() => setHoldModal(false)}>
              <Ionicons name="close-circle" size={28} color="#e53935" />
            </TouchableOpacity>
            <View style={styles.listModalHeader}>
              <Ionicons name="pause-circle-outline" size={24} color="#FF9800" />
              <Text style={[styles.listModalTitle, { color: "#FF9800" }]}>Hold bills</Text>
            </View>

            {bill.length > 0 && (
              <TouchableOpacity style={styles.holdCurrentBtn} onPress={holdCurrentBill} disabled={submitting}>
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.holdCurrentBtnText}>Hold Current Bill (Rs.{netPay.toLocaleString()})</Text>}
              </TouchableOpacity>
            )}

            {/* Table header */}
            <View style={styles.listTableHeader}>
              <Text style={[styles.listThCell, { flex: 1.2 }]}>Date</Text>
              <Text style={[styles.listThCell, { flex: 1 }]}>Bill No.</Text>
              <Text style={[styles.listThCell, { flex: 1 }]}>Amount</Text>
              <Text style={[styles.listThCell, { flex: 1.2, textAlign: "center" }]}>Action</Text>
            </View>

            {loadingHeld
              ? <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
              : heldBills.length === 0
                ? <Text style={styles.listEmpty}>No held bills</Text>
                : (
                  <ScrollView style={{ maxHeight: 250 }}>
                    {heldBills.map((h) => (
                      <View key={h.id} style={styles.listRow}>
                        <Text style={[styles.listTdCell, { flex: 1.2 }]}>{formatDate(h.createdAt)}</Text>
                        <Text style={[styles.listTdCell, { flex: 1 }]}>{h.billNumber.replace("BILL-","")}</Text>
                        <Text style={[styles.listTdCell, { flex: 1 }]}>Rs.{h.netPay.toLocaleString()}</Text>
                        <View style={[styles.listActionCell, { flex: 1.2 }]}>
                          <TouchableOpacity onPress={() => restoreHeldBill(h)}>
                            <Ionicons name="eye-outline" size={18} color="#2196F3" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => restoreHeldBill(h)}>
                            <Ionicons name="arrow-undo-outline" size={18} color="#4CAF50" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => deleteHeldBill(h.id)}>
                            <Ionicons name="close" size={18} color="#e53935" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )
            }
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════
          MODAL 6 — Recent Bills
      ══════════════════════════════════════════════ */}
      <Modal visible={recentModal} animationType="slide" transparent>
        <View style={styles.modalOverlayCentered}>
          <View style={styles.listModalCard}>
            <TouchableOpacity style={styles.modalCloseX} onPress={() => setRecentModal(false)}>
              <Ionicons name="close-circle" size={28} color="#e53935" />
            </TouchableOpacity>
            <View style={styles.listModalHeader}>
              <Ionicons name="time-outline" size={24} color="#00BCD4" />
              <Text style={[styles.listModalTitle, { color: "#00BCD4" }]}>Recent bills</Text>
            </View>

            <View style={styles.listTableHeader}>
              <Text style={[styles.listThCell, { flex: 1.5 }]}>Date & Time</Text>
              <Text style={[styles.listThCell, { flex: 1 }]}>Bill No.</Text>
              <Text style={[styles.listThCell, { flex: 1 }]}>Amount</Text>
              <Text style={[styles.listThCell, { flex: 1, textAlign: "center" }]}>Action</Text>
            </View>

            {loadingRecent
              ? <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
              : recentBills.length === 0
                ? <Text style={styles.listEmpty}>No recent bills</Text>
                : (
                  <ScrollView style={{ maxHeight: 300 }}>
                    {recentBills.map((r) => (
                      <View key={r.id} style={styles.listRow}>
                        <Text style={[styles.listTdCell, { flex: 1.5 }]}>{formatDate(r.createdAt)}</Text>
                        <Text style={[styles.listTdCell, { flex: 1 }]}>{r.billNumber.replace("BILL-","")}</Text>
                        <Text style={[styles.listTdCell, { flex: 1 }]}>Rs.{r.netPay.toLocaleString()}</Text>
                        <View style={[styles.listActionCell, { flex: 1 }]}>
                          <TouchableOpacity onPress={() => openViewItems(r)}>
                            <Ionicons name="eye-outline" size={18} color="#2196F3" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => reprintRecent(r)} disabled={reprintingId === r.id}>
                            {reprintingId === r.id
                              ? <ActivityIndicator size={14} color="#FF9800" />
                              : <Ionicons name="print-outline" size={18} color="#FF9800" />}
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => deleteRecentBill(r.id)}>
                            <Ionicons name="close" size={18} color="#e53935" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )
            }
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════
          MODAL 6B — View Items Sold (Recent Bill)
      ══════════════════════════════════════════════ */}
      <Modal visible={viewItemsModal} animationType="slide" transparent onRequestClose={() => setViewItemsModal(false)}>
        <View style={styles.modalOverlayCentered}>
          <View style={styles.listModalCard}>
            <TouchableOpacity style={styles.modalCloseX} onPress={() => setViewItemsModal(false)}>
              <Ionicons name="close-circle" size={28} color="#e53935" />
            </TouchableOpacity>
            <View style={styles.listModalHeader}>
              <Ionicons name="receipt-outline" size={24} color="#2196F3" />
              <Text style={[styles.listModalTitle, { color: "#2196F3" }]}>
                Bill {viewItemsBill?.billNumber?.replace("BILL-","") ?? ""} Items
              </Text>
            </View>
            <View style={styles.listTableHeader}>
              <Text style={[styles.listThCell, { flex: 2.5 }]}>Item</Text>
              <Text style={[styles.listThCell, { flex: 0.7, textAlign: "center" }]}>Qty</Text>
              <Text style={[styles.listThCell, { flex: 1.2, textAlign: "right" }]}>Amount</Text>
            </View>
            {loadingViewItems
              ? <ActivityIndicator style={{ marginTop: 20 }} color="#2196F3" />
              : viewItemsList.length === 0
                ? <Text style={styles.listEmpty}>No items found</Text>
                : (
                  <ScrollView style={{ maxHeight: 320 }}>
                    {viewItemsList.map((it: any, idx: number) => (
                      <View key={idx} style={styles.listRow}>
                        <Text style={[styles.listTdCell, { flex: 2.5 }]}>{it.itemName ?? it.item_name}</Text>
                        <Text style={[styles.listTdCell, { flex: 0.7, textAlign: "center" }]}>{it.qty}</Text>
                        <Text style={[styles.listTdCell, { flex: 1.2, textAlign: "right" }]}>Rs.{(it.total ?? 0).toLocaleString()}</Text>
                      </View>
                    ))}
                    <View style={[styles.listRow, { borderTopWidth: 1, borderTopColor: "#ddd" }]}>
                      <Text style={[styles.listTdCell, { flex: 2.5, fontWeight: "700" }]}>Total</Text>
                      <Text style={[styles.listTdCell, { flex: 0.7 }]} />
                      <Text style={[styles.listTdCell, { flex: 1.2, textAlign: "right", fontWeight: "700" }]}>
                        Rs.{(viewItemsBill?.netPay ?? 0).toLocaleString()}
                      </Text>
                    </View>
                  </ScrollView>
                )
            }
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════
          MODAL 7 — Receipt / Printed Bill
      ══════════════════════════════════════════════ */}
      <Modal visible={receiptModal} animationType="fade" transparent>
        <View style={styles.receiptOverlay}>
          <View style={styles.receiptCard}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: "100%" }} contentContainerStyle={{ alignItems: "stretch" }}>
              {receiptData && (
                <View style={styles.receiptPaper}>
                  {/* Logo */}
                  {receiptData.logoUrl ? (
                    <Image
                      source={{ uri: receiptData.logoUrl }}
                      style={styles.rcLogo}
                      resizeMode="contain"
                    />
                  ) : null}

                  {/* Shop Header */}
                  <View style={{ alignSelf: "stretch", alignItems: "center" }}>
                    <Text style={styles.rcShopName}>{receiptData.shopName}</Text>
                    {receiptData.shopAddress ? (
                      <Text style={styles.rcShopAddr}>{receiptData.shopAddress}</Text>
                    ) : null}
                    {receiptData.shopPhone ? (
                      <Text style={styles.rcShopAddr}>{receiptData.shopPhone}</Text>
                    ) : null}
                    <Text style={styles.rcDash}>--------------------------------</Text>
                    {receiptData.receiptHeader ? (
                      <Text style={styles.rcHeaderMsg}>{receiptData.receiptHeader}</Text>
                    ) : null}
                  </View>

                  {/* Invoice No + Date rows */}
                  <View style={styles.rcMetaRow}>
                    <Text style={styles.rcMetaLabel}>Invoice No</Text>
                    <Text style={styles.rcMetaVal}>{receiptData.billNumber}</Text>
                  </View>
                  <View style={styles.rcMetaRow}>
                    <Text style={styles.rcMetaLabel}>Date</Text>
                    <Text style={styles.rcMetaVal}>{receiptData.printedAt}</Text>
                  </View>

                  {/* Items table */}
                  <View style={styles.rcTableHeader}>
                    <Text style={[styles.rcThCell, { flex: 0.5 }]}>NO</Text>
                    <Text style={[styles.rcThCell, { flex: 2.2 }]}>Item</Text>
                    <Text style={[styles.rcThCell, { flex: 0.6, textAlign: "center" }]}>Qty</Text>
                    <Text style={[styles.rcThCell, { flex: 1, textAlign: "right" }]}>Amount</Text>
                  </View>
                  {receiptData.items.map((item, idx) => (
                    <View key={idx} style={[styles.rcTdRow, idx % 2 === 1 && styles.rcTdRowAlt]}>
                      <Text style={[styles.rcTdCell, { flex: 0.5 }]}>{idx + 1}</Text>
                      <Text style={[styles.rcTdCell, { flex: 2.2 }]} numberOfLines={2}>{item.itemName}</Text>
                      <Text style={[styles.rcTdCell, { flex: 0.6, textAlign: "center" }]}>{item.qty}</Text>
                      <Text style={[styles.rcTdCell, { flex: 1, textAlign: "right", fontWeight: "700" }]}>
                        Rs.{item.total.toLocaleString()}
                      </Text>
                    </View>
                  ))}

                  <Text style={styles.rcDash}>--------------------------------</Text>

                  {/* Totals */}
                  <View style={styles.rcTotalRow}>
                    <Text style={styles.rcTotalLabel}>Subtotal</Text>
                    <Text style={styles.rcTotalVal}>Rs. {receiptData.subtotal.toFixed(2)}</Text>
                  </View>
                  {receiptData.discount > 0 && (
                    <View style={styles.rcTotalRow}>
                      <Text style={styles.rcTotalLabel}>Discount</Text>
                      <Text style={[styles.rcTotalVal, { color: "#e53935" }]}>- Rs. {receiptData.discount.toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={[styles.rcTotalRow, styles.rcNetPayRow]}>
                    <Text style={styles.rcNetPayLabel}>Total</Text>
                    <Text style={styles.rcNetPayVal}>Rs. {receiptData.netPay.toFixed(2)}</Text>
                  </View>

                  {/* Payment details */}
                  {!receiptData.isCredit ? (
                    <>
                      <View style={styles.rcTotalRow}>
                        <Text style={styles.rcTotalLabel}>
                          Cash ({receiptData.paymentMethod.charAt(0).toUpperCase() + receiptData.paymentMethod.slice(1)}) {receiptData.printedAt}
                        </Text>
                      </View>
                      <View style={styles.rcTotalRow}>
                        <Text style={styles.rcTotalLabel}>Total Paid</Text>
                        <Text style={styles.rcTotalVal}>Rs. {receiptData.cashPaid.toFixed(2)}</Text>
                      </View>
                      <View style={styles.rcTotalRow}>
                        <Text style={styles.rcTotalLabel}>{receiptData.balance >= 0 ? "Balance" : "Due"}</Text>
                        <Text style={[styles.rcTotalVal, { color: receiptData.balance >= 0 ? "#16a34a" : "#e53935", fontWeight: "800" }]}>
                          Rs. {Math.abs(receiptData.balance).toFixed(2)}
                        </Text>
                      </View>
                      {receiptData.paymentMethod === "part" && receiptData.customerName ? (
                        <View style={[styles.rcTotalRow, { backgroundColor: "#FFF7ED", borderRadius: 6, paddingHorizontal: 8, marginVertical: 2 }]}>
                          <Text style={[styles.rcTotalLabel, { color: "#D97706", fontWeight: "700" }]}>⚠ PARTIAL PAYMENT</Text>
                        </View>
                      ) : null}
                      {receiptData.paymentMethod === "part" && receiptData.customerName ? (
                        <View style={styles.rcTotalRow}>
                          <Text style={styles.rcTotalLabel}>Customer</Text>
                          <Text style={[styles.rcTotalVal, { fontWeight: "700" }]}>{receiptData.customerName}</Text>
                        </View>
                      ) : null}
                      {receiptData.paymentMethod === "part" && receiptData.customerPhone ? (
                        <View style={styles.rcTotalRow}>
                          <Text style={styles.rcTotalLabel}>Phone</Text>
                          <Text style={styles.rcTotalVal}>{receiptData.customerPhone}</Text>
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <View style={[styles.rcTotalRow, { backgroundColor: "#FFF7ED", borderRadius: 6, paddingHorizontal: 8, marginVertical: 2 }]}>
                        <Text style={[styles.rcTotalLabel, { color: "#EA580C", fontWeight: "700" }]}>⚠ CREDIT SALE</Text>
                        <Text style={[styles.rcTotalVal, { color: "#EA580C" }]}>Rs. {receiptData.netPay.toFixed(2)}</Text>
                      </View>
                      {receiptData.customerName ? (
                        <View style={styles.rcTotalRow}>
                          <Text style={styles.rcTotalLabel}>Customer</Text>
                          <Text style={styles.rcTotalVal}>{receiptData.customerName}</Text>
                        </View>
                      ) : null}
                      {receiptData.creditDate ? (
                        <View style={styles.rcTotalRow}>
                          <Text style={styles.rcTotalLabel}>Promised Date</Text>
                          <Text style={[styles.rcTotalVal, { color: "#7C3AED", fontWeight: "700" }]}>{receiptData.creditDate}</Text>
                        </View>
                      ) : null}
                    </>
                  )}

                  <View style={{ alignSelf: "stretch", alignItems: "center" }}>
                    <Text style={styles.rcDash}>--------------------------------</Text>
                    {printerSettings.receiptFooter ? (
                      <Text style={styles.rcFooter}>{printerSettings.receiptFooter}</Text>
                    ) : null}
                    <Text style={styles.rcFooter}>Thank you for your Trust!</Text>
                    <Text style={styles.rcFooterSub}>ATOM POS by AxisXNOR</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Action buttons */}
            <View style={styles.rcActions}>
              <TouchableOpacity
                style={[styles.rcActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => { setReceiptModal(false); setReceiptData(null); }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.rcActionText}>New Bill</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rcActionBtn, { backgroundColor: "#FF9800" }]}
                onPress={async () => {
                  if (!receiptData) return;
                  const ps = printerSettings;
                  if (!ps.printerEnabled) {
                    Alert.alert("Printer Disabled", "Enable the printer in Settings first.");
                    return;
                  }
                  let text = "";
                  try {
                    text = buildReceiptText({
                      shopName: receiptData.shopName ?? "",
                      shopAddress: receiptData.shopAddress ?? "",
                      shopPhone: receiptData.shopPhone ?? "",
                      receiptHeader: ps.receiptHeader ?? "",
                      receiptFooter: ps.receiptFooter ?? "",
                      paperWidth: ps.paperWidth ?? "80mm",
                      billNumber: receiptData.billNumber ?? "---",
                      printedAt: receiptData.printedAt ?? "",
                      paymentMethod: receiptData.paymentMethod ?? "cash",
                      isCredit: receiptData.isCredit,
                      customerName: receiptData.customerName,
                      customerPhone: receiptData.customerPhone,
                      creditDate: receiptData.creditDate,
                      items: (receiptData.items ?? []).map((it: any) => ({
                        ...it,
                        pricePerItem: it.pricePerItem ?? (it.qty ? it.total / it.qty : it.total) ?? 0,
                        total: it.total ?? 0,
                        qty: it.qty ?? 1,
                        itemName: it.itemName ?? "",
                      })),
                      subtotal: receiptData.subtotal ?? 0,
                      discount: receiptData.discount ?? 0,
                      netPay: receiptData.netPay ?? 0,
                      cashPaid: receiptData.cashPaid ?? 0,
                      balance: receiptData.balance ?? 0,
                    });
                  } catch (buildErr: any) {
                    Alert.alert("Print Error", "Failed to build receipt: " + (buildErr?.message || "unknown error"));
                    return;
                  }

                  // Request BT permissions before touching native module — missing perms = native crash
                  if (ps.printerType === "bluetooth") {
                    const { PermissionsAndroid, Platform } = require("react-native");
                    if (Platform.OS === "android") {
                      try {
                        const granted = await PermissionsAndroid.requestMultiple([
                          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                        ]);
                        const ok =
                          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
                          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;
                        if (!ok) {
                          Alert.alert("Permission Required", "Bluetooth permission denied.\n\nGo to Settings → Apps → Permissions → Nearby Devices.");
                          return;
                        }
                      } catch (permErr: any) {
                        Alert.alert("Permission Error", permErr?.message || "Could not request Bluetooth permissions.");
                        return;
                      }
                    }
                  }

                  let BLE2: any, Net2: any;
                  try {
                    const printer = getPrinter();
                    BLE2 = printer.BLEPrinter;
                    Net2 = printer.NetPrinter;
                  } catch (modErr: any) {
                    Alert.alert("Printer Error", "Printer module unavailable: " + (modErr?.message || "unknown error"));
                    return;
                  }

                  const logoUrl = ps.logoUrl ?? "";
                  try {
                    if (ps.printerType === "bluetooth") {
                      if (!ps.printerAddress) { Alert.alert("No Printer", "Select a Bluetooth printer in Settings first."); return; }
                      try {
                        await bleConnectAndPrint(BLE2, ps.printerAddress, text, logoUrl);
                      } catch (e: any) {
                        Alert.alert("Print Failed", e?.message || "Could not print.");
                        return;
                      }
                    } else {
                      if (!ps.wifiHost) { Alert.alert("No IP", "Enter printer IP in Settings first."); return; }
                      try { await Net2.init(); } catch (_) {}
                      try {
                        await Net2.connectPrinter(ps.wifiHost, parseInt(ps.wifiPort || "9100"));
                      } catch (connErr: any) {
                        Alert.alert("Connection Failed", connErr?.message || "Could not connect to Wi-Fi printer.");
                        return;
                      }
                      try {
                        if (logoUrl) {
                          const base64 = logoUrl.includes(",") ? logoUrl.split(",")[1] : logoUrl;
                          try { await Net2.printImageBase64(base64, { imageWidth: 200, paddingX: 0 }); } catch (_) {}
                        }
                        await Net2.printRaw(buildRawBase64(text));
                      } catch (printErr: any) {
                        Alert.alert("Print Failed", printErr?.message || "Connected but could not print.");
                        return;
                      }
                    }
                  } catch (e: any) {
                    Alert.alert("Print Error", e?.message || "Could not print.");
                  }
                }}
              >
                <Ionicons name="print-outline" size={20} color="#fff" />
                <Text style={styles.rcActionText}>Print</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rcActionBtn, { backgroundColor: "#25D366" }]}
                onPress={() => {
                  if (!receiptData) return;
                  // Build rich WhatsApp bill
                  const sep = "─────────────────────";
                  const lines = receiptData.items.map((it, i) =>
                    `  ${i + 1}. ${it.itemName}\n     ${it.qty} x Rs.${it.pricePerItem.toLocaleString()} = *Rs.${it.total.toLocaleString()}*`
                  ).join("\n");
                  const pmLabel = receiptData.isCredit ? "Credit" : (receiptData.paymentMethod.charAt(0).toUpperCase() + receiptData.paymentMethod.slice(1));
                  let msg = `🧾 *${receiptData.shopName}*`;
                  if (receiptData.shopAddress) msg += `\n📍 ${receiptData.shopAddress}`;
                  if (receiptData.shopPhone) msg += `\n📞 ${receiptData.shopPhone}`;
                  msg += `\n${sep}`;
                  msg += `\n📋 Bill: *${receiptData.billNumber}*`;
                  msg += `\n🕐 ${receiptData.printedAt}`;
                  msg += `\n💳 Payment: ${pmLabel}`;
                  msg += `\n${sep}`;
                  msg += `\n${lines}`;
                  msg += `\n${sep}`;
                  msg += `\nSubtotal: Rs.${receiptData.subtotal.toLocaleString()}`;
                  if (receiptData.discount > 0) msg += `\nDiscount: -Rs.${receiptData.discount.toLocaleString()}`;
                  msg += `\n*Net Pay: Rs.${receiptData.netPay.toLocaleString()}*`;
                  if (!receiptData.isCredit) {
                    msg += `\nTotal Paid: Rs.${receiptData.cashPaid.toLocaleString()}`;
                    msg += `\nBalance: Rs.${Math.abs(receiptData.balance).toLocaleString()}`;
                  }
                  if (receiptData.isCredit) {
                    msg += `\n${sep}`;
                    msg += `\n⚠️ *CREDIT SALE*`;
                    msg += `\n👤 Customer: ${receiptData.customerName ?? ""}`;
                    if (receiptData.customerPhone) msg += `\n📞 Phone: ${receiptData.customerPhone}`;
                    if (receiptData.creditDate) msg += `\n📅 Promised Date: *${receiptData.creditDate}*`;
                  }
                  msg += `\n${sep}`;
                  msg += `\n_Thank you! Come again_ 🙏`;
                  // Use customer phone if credit, else shop whatsapp
                  const phone = (receiptData.isCredit && receiptData.customerPhone)
                    ? receiptData.customerPhone.replace(/\D/g, "")
                    : (receiptData.whatsappPhone ?? "").replace(/\D/g, "");
                  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
                  Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open WhatsApp"));
                }}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                <Text style={styles.rcActionText}>WhatsApp</Text>
              </TouchableOpacity>

            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════
          Date Picker Modal
      ══════════════════════════════════════════════ */}
      <Modal visible={datePickerVisible} animationType="fade" transparent>
        <View style={styles.modalOverlayCentered}>
          <View style={[styles.centeredModalCard, { width: 300 }]}>
            <Text style={[styles.modalTitle, { marginBottom: 16 }]}>Select Promised Date</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              {/* Day */}
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Day</Text>
                <TouchableOpacity onPress={() => setDpDay(d => d > 1 ? d - 1 : 31)} style={styles.dpArrow}>
                  <Ionicons name="chevron-up" size={18} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.dpValue}>{String(dpDay).padStart(2, "0")}</Text>
                <TouchableOpacity onPress={() => setDpDay(d => d < 31 ? d + 1 : 1)} style={styles.dpArrow}>
                  <Ionicons name="chevron-down" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={{ alignSelf: "center", fontSize: 20, color: "#888", marginTop: 8 }}>/</Text>
              {/* Month */}
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Month</Text>
                <TouchableOpacity onPress={() => setDpMonth(m => m > 1 ? m - 1 : 12)} style={styles.dpArrow}>
                  <Ionicons name="chevron-up" size={18} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.dpValue}>{String(dpMonth).padStart(2, "0")}</Text>
                <TouchableOpacity onPress={() => setDpMonth(m => m < 12 ? m + 1 : 1)} style={styles.dpArrow}>
                  <Ionicons name="chevron-down" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={{ alignSelf: "center", fontSize: 20, color: "#888", marginTop: 8 }}>/</Text>
              {/* Year */}
              <View style={{ flex: 1.5, alignItems: "center" }}>
                <Text style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Year</Text>
                <TouchableOpacity onPress={() => setDpYear(y => y + 1)} style={styles.dpArrow}>
                  <Ionicons name="chevron-up" size={18} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.dpValue}>{dpYear}</Text>
                <TouchableOpacity onPress={() => setDpYear(y => y - 1)} style={styles.dpArrow}>
                  <Ionicons name="chevron-down" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
              <TouchableOpacity style={{ flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#ddd", alignItems: "center" }}
                onPress={() => setDatePickerVisible(false)}>
                <Text style={{ color: "#666" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center" }}
                onPress={() => {
                  const y = dpYear;
                  const m = String(dpMonth).padStart(2, "0");
                  const d = String(dpDay).padStart(2, "0");
                  setCreditDate(`${y}-${m}-${d}`);
                  setDatePickerVisible(false);
                }}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════
          MODAL — Due Customer (partial payment)
      ══════════════════════════════════════════════ */}
      <Modal visible={dueModal} animationType="fade" transparent>
        <View style={styles.modalOverlayCentered}>
          <View style={[styles.centeredModalCard, { maxWidth: 360 }]}>
            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <Ionicons name="person-add-outline" size={32} color="#FF9800" />
              <Text style={[styles.modalTitle, { marginTop: 6, marginBottom: 2 }]}>Amount Short!</Text>
              <Text style={{ fontSize: 12, color: "#888", textAlign: "center", marginBottom: 10 }}>
                Paid less than total. Record customer details for the due amount? (Optional)
              </Text>
              {pendingReceiptData && (
                <View style={{ backgroundColor: "#FFF3E0", borderRadius: 8, padding: 10, width: "100%", marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#E65100", textAlign: "center" }}>
                    Due: Rs.{Math.abs(pendingReceiptData.balance).toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
            <TextInput
              style={styles.creditField}
              value={dueName}
              onChangeText={setDueName}
              placeholder="Customer name (optional)"
              placeholderTextColor="#aaa"
            />
            <TextInput
              style={styles.creditField}
              value={duePhone}
              onChangeText={setDuePhone}
              placeholder="Phone number (optional)"
              placeholderTextColor="#aaa"
              keyboardType="phone-pad"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: "#9E9E9E" }]}
                onPress={() => confirmDueCustomer(pendingReceiptData)}
              >
                <Text style={styles.cancelBtnText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => confirmDueCustomer(pendingReceiptData, dueName.trim() || undefined, duePhone.trim() || undefined)}
              >
                <Text style={styles.addBtnText}>Save & Print</Text>
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

  // Skeleton styles
  skeletonHeader: { height: 58, backgroundColor: colors.primary, margin: 0 },
  skeletonCatRow: { flexDirection: "row", padding: 10, gap: 8 },
  skeletonCat: { height: 30, width: 72, borderRadius: 20, backgroundColor: "#e8e8e8" },
  skeletonGrid: { flexDirection: "row", flexWrap: "wrap", padding: 6, gap: 6, flex: 1 },
  skeletonItem: { width: "31%", aspectRatio: 0.9, borderRadius: 10, backgroundColor: "#e8e8e8" },
  skeletonBillingArea: { height: 220, backgroundColor: "#f0f0f0", borderTopLeftRadius: 16, borderTopRightRadius: 16 },

  // ── Header ──
  header: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  headerLeft: { flex: 1, gap: 5 },
  headerShopName: { fontSize: 18, fontWeight: "bold", color: "#fff", letterSpacing: 0.5, textAlign: "center" },
  searchBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4, height: 30,
  },
  searchInput: { flex: 1, fontSize: 12, color: "#fff", paddingVertical: 0, height: 22 },
  headerRight: { alignItems: "flex-end", justifyContent: "center", gap: 2 },
  headerStaff: { fontSize: 12, fontWeight: "700", color: "#fff" },
  headerDateTime: { fontSize: 10, color: "rgba(255,255,255,0.85)" },

  // ── Category tabs ──
  catScroll: { maxHeight: 42, paddingVertical: 5, backgroundColor: "#f9f9f9" },
  catTab: { paddingHorizontal: 13, paddingVertical: 4, borderRadius: 20, borderWidth: 1.5 },
  catTabText: { fontSize: 12 },

  // ── Item grid ──
  grid: { flex: 1, backgroundColor: colors.bg },
  itemCard: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 10, padding: 7,
    borderWidth: 1.5, gap: 6,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  itemIconBox: { width: 38, height: 38, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" },
  itemIconImg: { width: 38, height: 38, borderRadius: 8 },
  itemName: { flex: 1, fontSize: 10, fontWeight: "600", color: "#333", lineHeight: 13 },
  emptyText: { textAlign: "center", color: colors.textSecondary, fontSize: 12, padding: 20 },

  // ── Billing area ──
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

  summaryBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 6,
    borderTopWidth: 1, borderTopColor: "#d0eeeb",
  },
  summaryText: { fontSize: 11, color: "#444" },
  summaryVal: { fontWeight: "700", color: "#333" },
  summaryNetPay: { fontSize: 12, color: colors.primary },
  summaryNetVal: { fontWeight: "800", color: colors.primary },

  // ── Action bar (5 icons with labels) ──
  actionBar: {
    flexDirection: "row", backgroundColor: colors.primary,
    paddingVertical: 6, paddingHorizontal: 6, gap: 5,
  },
  actionBtn: {
    flex: 1, height: 50, borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center", gap: 2,
  },
  printBtn: { backgroundColor: "#007A6E" },
  actionLabel: { fontSize: 9, color: "#fff", fontWeight: "600", textAlign: "center" },

  // ── Modals ──
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  modalOverlayCentered: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: {
    backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 16, paddingHorizontal: 16, paddingBottom: 16, maxHeight: "94%",
  },
  centeredModalCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20,
    width: "100%", maxWidth: 380,
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#222", marginBottom: 12, textAlign: "center" },

  // item add modal
  modalItemRow: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12,
    backgroundColor: "#f9f9f9", borderRadius: 12, padding: 10,
  },
  modalItemIconBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: "#fff8e1", alignItems: "center", justifyContent: "center" },
  modalItemName: { flex: 1, fontSize: 15, fontWeight: "700", color: "#222" },
  qtyBox: { minWidth: 52, height: 40, borderWidth: 1.5, borderColor: "#f59e0b", borderRadius: 8, paddingHorizontal: 8, fontSize: 18, fontWeight: "700", color: "#222", textAlign: "center" },
  qtyBoxText: { fontSize: 18, fontWeight: "700", color: "#222" },
  pricePanelRow: { flexDirection: "row", gap: 10, marginBottom: 12, borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 10 },
  priceLeftPanel: { flex: 1 },
  pricePanelLabel: { fontSize: 11, color: "#888", marginBottom: 4 },
  pricePanelBox: { backgroundColor: "#f0f0f0", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 4 },
  pricePanelVal: { fontSize: 20, fontWeight: "700", color: "#222" },
  priceRightPanel: { flex: 1.4 },
  pgChipsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  pgChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: "#fff" },
  pgChipActive: { backgroundColor: colors.primary },
  pgChipText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  pgChipTextActive: { color: "#fff" },

  numpad: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  numKey: {
    width: (width - 32 - 24) / 3, paddingVertical: 13,
    backgroundColor: "#f5f5f5", borderRadius: 10, alignItems: "center",
    borderWidth: 1, borderColor: "#e0e0e0",
  },
  numKeyText: { fontSize: 17, fontWeight: "600", color: "#333" },

  modalBtns: { flexDirection: "row", gap: 12 },
  addBtn: { flex: 1, paddingVertical: 13, backgroundColor: colors.primary, borderRadius: 10, alignItems: "center" },
  addBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: "#e53935", alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  cancelLink: { fontSize: 13, color: "#e53935", fontWeight: "600" },

  // Quick Bill
  quickBillLabel: { fontSize: 12, color: "#888", textAlign: "center", marginBottom: 6, marginTop: 6 },
  quickItemNameInput: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, fontWeight: "600", color: "#222",
    textAlign: "center", marginBottom: 4, backgroundColor: "#fafafa",
  },
  quickAmountBox: {
    borderWidth: 1.5, borderColor: "#ccc", borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 16, marginBottom: 12, alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  quickAmountText: { fontSize: 28, fontWeight: "700", color: "#222" },

  // Discount modal
  discountAmountRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: 4 },
  discountAmountLabel: { fontSize: 14, color: "#555" },
  discountAmountVal: { fontSize: 14, fontWeight: "700", color: "#333" },
  discountField: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 12, fontSize: 16, marginBottom: 12, color: colors.textPrimary,
  },
  discountPreview: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: colors.primaryLight, borderRadius: 8, padding: 10, marginBottom: 16,
  },
  discountPreviewLabel: { fontSize: 14, color: colors.primary, fontWeight: "600" },
  discountPreviewVal: { fontSize: 16, fontWeight: "800", color: colors.primary },

  // Print Bill modal
  printBillAmount: { textAlign: "center", fontSize: 15, fontWeight: "700", color: "#333", marginBottom: 14 },
  payMethodRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  payMethodBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: colors.primary },
  payMethodActive: { backgroundColor: colors.primary },
  payMethodText: { fontSize: 14, fontWeight: "700", color: colors.primary },
  balanceRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 },
  balanceLabel: { fontSize: 14, fontWeight: "700", color: "#333" },
  balanceVal: { fontSize: 18, fontWeight: "800" },
  creditSaleLink: { fontSize: 12, color: colors.primary, fontWeight: "600", textDecorationLine: "underline", textAlign: "center", marginTop: 4 },

  // Credit Note
  creditNoteBox: {
    borderWidth: 1.5, borderColor: "#ddd", borderRadius: 14, padding: 14, marginBottom: 8,
    backgroundColor: "#fafafa",
  },
  creditNoteTitle: { fontSize: 15, fontWeight: "700", color: "#333", marginBottom: 12, textAlign: "center" },
  creditField: {
    borderWidth: 1, borderColor: "#ccc", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, marginBottom: 10,
    color: "#333", backgroundColor: "#fff",
  },
  creditDateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  creditDateLabel: { fontSize: 12, color: "#666", flexShrink: 0 },
  dpArrow: { padding: 6, borderRadius: 6, backgroundColor: "#f0f0f0", marginVertical: 2 },
  dpValue: { fontSize: 22, fontWeight: "700", color: "#222", minWidth: 40, textAlign: "center", paddingVertical: 4 },

  // Hold / Recent list modal
  listModalCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 16,
    width: "100%", maxWidth: 400, maxHeight: "80%",
  },
  modalCloseX: { position: "absolute", top: 10, right: 10, zIndex: 10 },
  listModalHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14, marginTop: 4 },
  listModalTitle: { fontSize: 18, fontWeight: "800" },
  holdCurrentBtn: {
    backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10,
    alignItems: "center", marginBottom: 12,
  },
  holdCurrentBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  listTableHeader: {
    flexDirection: "row", backgroundColor: "#f5f5f5",
    paddingHorizontal: 8, paddingVertical: 6,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#e0e0e0",
    marginBottom: 2,
  },
  listThCell: { fontSize: 11, fontWeight: "700", color: "#555" },
  listRow: { flexDirection: "row", paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", alignItems: "center" },
  listTdCell: { fontSize: 11, color: "#333" },
  listActionCell: { flexDirection: "row", gap: 10, justifyContent: "center" },
  listEmpty: { textAlign: "center", color: "#aaa", fontSize: 12, paddingVertical: 24 },

  // ── Receipt Modal ──
  receiptOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center", padding: 16, paddingHorizontal: 20 },
  receiptCard: {
    backgroundColor: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, maxHeight: "90%",
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 16, elevation: 10,
    overflow: "hidden", alignSelf: "stretch",
  },
  receiptPaper: {
    backgroundColor: "#fffef8", padding: 18, alignSelf: "stretch", flexGrow: 1,
  },
  rcLogo: { width: 72, height: 72, borderRadius: 36, alignSelf: "center", marginBottom: 8 },
  rcShopName: { fontSize: 22, fontWeight: "bold", color: "#111", textAlign: "center", letterSpacing: 0.5, marginBottom: 2, textTransform: "uppercase" },
  rcShopAddr: { fontSize: 11, color: "#555", textAlign: "center", marginBottom: 1 },
  rcDash: { fontSize: 10, color: "#aaa", textAlign: "center", marginVertical: 5, fontFamily: "monospace" },
  rcMetaRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  rcMetaLabel: { fontSize: 11, color: "#666", fontWeight: "600" },
  rcMetaVal: { fontSize: 11, color: "#222", fontWeight: "700" },
  rcItemBlock: { marginVertical: 3 },
  rcItemName: { fontSize: 11, fontWeight: "700", color: "#222" },
  rcItemDetailRow: { flexDirection: "row", alignItems: "center" },
  rcItemDetail: { fontSize: 10, color: "#555", minWidth: 90 },
  rcItemDots: { flex: 1, fontSize: 10, color: "#bbb", overflow: "hidden" },
  rcItemTotal: { fontSize: 11, fontWeight: "700", color: "#111", minWidth: 60, textAlign: "right" },
  rcHeaderMsg: { fontSize: 11, color: "#444", textAlign: "center", marginBottom: 6, fontStyle: "italic" },
  rcTableHeader: { flexDirection: "row", backgroundColor: "#111", paddingVertical: 6, paddingHorizontal: 4, marginTop: 8, marginBottom: 0 },
  rcThCell: { fontSize: 11, fontWeight: "700", color: "#fff" },
  rcTdRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "#eee" },
  rcTdRowAlt: { backgroundColor: "#f9f9f9" },
  rcTdCell: { fontSize: 11, color: "#222" },
  rcTotalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  rcTotalLabel: { fontSize: 11, color: "#555", flex: 1 },
  rcTotalVal: { fontSize: 11, color: "#222", fontWeight: "600" },
  rcNetPayRow: { backgroundColor: "#f0faf8", borderRadius: 6, paddingHorizontal: 8, marginVertical: 3, paddingVertical: 4 },
  rcNetPayLabel: { fontSize: 20, fontWeight: "bold", color: colors.primary },
  rcNetPayVal: { fontSize: 20, fontWeight: "bold", color: colors.primary },
  rcFooter: { fontSize: 12, fontWeight: "700", color: "#333", textAlign: "center", marginTop: 4 },
  rcFooterSub: { fontSize: 10, color: "#aaa", textAlign: "center", marginTop: 2 },
  rcActions: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#eee" },
  rcActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14 },
  rcActionText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
