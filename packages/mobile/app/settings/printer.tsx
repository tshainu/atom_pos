import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Switch, FlatList, Modal, TextInput,
  KeyboardAvoidingView, Platform, PermissionsAndroid,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getUser } from "../../lib/auth";
import { apiFetch, cachedFetchAsync } from "../../lib/api";
import { colors, spacing, radius } from "../../lib/theme";
// @ts-ignore
import { BLEPrinter, NetPrinter } from "react-native-thermal-receipt-printer-image-qr";

type PrinterType = "bluetooth" | "wifi";
type PaperWidth = "58mm" | "80mm";

interface PrinterSettings {
  printerEnabled: boolean;
  printerType: PrinterType;
  printerName: string;
  printerAddress: string;
  wifiHost: string;
  wifiPort: string;
  paperWidth: PaperWidth;
  receiptHeader: string;
  receiptFooter: string;
}

interface BtDevice {
  device_name: string;
  inner_mac_address: string;
}

const PAPER_WIDTHS: PaperWidth[] = ["58mm", "80mm"];

export default function PrinterSettingsScreen() {
  const [settings, setSettings] = useState<PrinterSettings>({
    printerEnabled: false,
    printerType: "bluetooth",
    printerName: "",
    printerAddress: "",
    wifiHost: "",
    wifiPort: "9100",
    paperWidth: "58mm",
    receiptHeader: "Thank you for shopping!",
    receiptFooter: "Visit us again",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<BtDevice[]>([]);
  const [showModal, setShowModal] = useState(false);

  const applySettings = (data: any) => {
    if (!data.error && data.settings) {
      setSettings({
        printerEnabled: !!data.settings.printerEnabled,
        printerType: (data.settings.printerType as PrinterType) ?? "bluetooth",
        printerName: data.settings.printerName ?? "",
        printerAddress: data.settings.printerAddress ?? "",
        wifiHost: data.settings.wifiHost ?? "",
        wifiPort: data.settings.wifiPort ?? "9100",
        paperWidth: (data.settings.paperWidth as PaperWidth) ?? "58mm",
        receiptHeader: data.settings.receiptHeader ?? "Thank you for shopping!",
        receiptFooter: data.settings.receiptFooter ?? "Visit us again",
      });
    }
  };

  const load = async () => {
    const u = await getUser();
    setUser(u);
    if (!u) { setLoading(false); return; }
    // Show cached immediately
    const cached = await cachedFetchAsync(`settings/${u.shopId}`);
    if (cached && !cached.error) { applySettings(cached); setLoading(false); }
    // Refresh in background
    apiFetch(`settings/${u.shopId}`).then((data) => { applySettings(data); setLoading(false); });
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const set = <K extends keyof PrinterSettings>(k: K, v: PrinterSettings[K]) =>
    setSettings((s) => ({ ...s, [k]: v }));

  const scanDevices = async () => {
    // Request Bluetooth permissions on Android 12+ before calling BLEPrinter.init()
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        ]);
        const connectOk = granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
        const scanOk = granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;
        if (!connectOk || !scanOk) {
          Alert.alert(
            "Bluetooth Permission Required",
            "Please grant Bluetooth permissions to scan for printers.\n\nGo to Settings → Apps → Pandora → Permissions → Nearby Devices."
          );
          return;
        }
      } catch (permErr: any) {
        Alert.alert("Permission Error", permErr?.message || "Could not request Bluetooth permissions.");
        return;
      }
    }

    setScanning(true);
    setDevices([]);
    setShowModal(true);
    try {
      await BLEPrinter.init();
      const list: BtDevice[] = await BLEPrinter.getDeviceList();
      setDevices(list || []);
      if (!list || list.length === 0) {
        Alert.alert("No Printers Found", "Make sure your printer is:\n• Turned on\n• Paired in Android Bluetooth settings");
      }
    } catch (e: any) {
      Alert.alert("Bluetooth Error", e?.message || "Could not scan. Enable Bluetooth and try again.");
      setShowModal(false);
    }
    setScanning(false);
  };

  const selectDevice = (device: BtDevice) => {
    set("printerName", device.device_name || "Unknown Printer");
    set("printerAddress", device.inner_mac_address);
    setShowModal(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const data = await apiFetch(`settings/${user?.shopId}`, {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      if (data.error) { Alert.alert("Error", data.error); return; }
      Alert.alert("Saved", "Printer settings saved.");
    } catch {
      Alert.alert("Error", "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const testPrint = async () => {
    try {
      const ESC = "\x1B";
      const GS = "\x1D";
      const RESET = `${ESC}@`;
      const BOLD_ON = `${ESC}E\x01`;
      const BOLD_OFF = `${ESC}E\x00`;
      const ALIGN_CENTER = `${ESC}a\x01`;
      const ALIGN_LEFT = `${ESC}a\x00`;
      const SIZE_NORMAL = `${GS}!\x00`;
      const SIZE_2X = `${GS}!\x11`;
      const SIZE_4X = `${GS}!\x33`;
      const is80 = settings.paperWidth !== "58mm";
      const SEP = is80 ? "=".repeat(48) : "=".repeat(32);
      const nameSize = is80 ? SIZE_4X : SIZE_2X;

      let text = RESET + ALIGN_CENTER;
      text += nameSize + BOLD_ON + "Test Print" + BOLD_OFF + SIZE_NORMAL + "\n";
      text += SEP + "\n" + ALIGN_LEFT;
      text += `Paper: ${settings.paperWidth}\n`;
      text += `Type: ${settings.printerType === "bluetooth" ? "Bluetooth" : "Wi-Fi"}\n`;
      text += SEP + "\n";
      if (settings.receiptHeader) text += ALIGN_CENTER + settings.receiptHeader + "\n" + ALIGN_LEFT;
      if (settings.receiptFooter) text += ALIGN_CENTER + settings.receiptFooter + "\n" + ALIGN_LEFT;
      text += ALIGN_CENTER + "ATOM POS by AxisXNOR" + ALIGN_LEFT + "\n\n\n";

      if (settings.printerType === "bluetooth") {
        if (!settings.printerAddress) { Alert.alert("No Printer", "Select a Bluetooth printer first."); return; }
        await BLEPrinter.init();
        await BLEPrinter.connectPrinter(settings.printerAddress);
        await BLEPrinter.printText(text);
      } else {
        if (!settings.wifiHost) { Alert.alert("No IP", "Enter printer IP address first."); return; }
        await NetPrinter.init();
        await NetPrinter.connectPrinter(settings.wifiHost, parseInt(settings.wifiPort || "9100"));
        await NetPrinter.printText(text);
      }
      Alert.alert("Success", "Test print sent!");
    } catch (e: any) {
      Alert.alert("Print Error", e?.message || "Could not print.");
    }
  };

  if (loading && !settings.printerAddress && !settings.wifiHost) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={{ padding: 16, gap: 14 }}>
          {[1,2,3].map((i) => <View key={i} style={{ height: 80, borderRadius: 12, backgroundColor: "#e8e8e8" }} />)}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Enable */}
          <SectionCard title="Printer">
            <View style={styles.toggleRow}>
              <View style={styles.iconWrap}>
                <Ionicons name="print-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Enable Printer</Text>
                <Text style={styles.toggleSub}>Print receipts after sale</Text>
              </View>
              <Switch
                value={settings.printerEnabled}
                onValueChange={(v) => set("printerEnabled", v)}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor={settings.printerEnabled ? "#fff" : "#f4f3f4"}
              />
            </View>
          </SectionCard>

          {/* Connection type */}
          <SectionCard title="Connection Type">
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, settings.printerType === "bluetooth" && styles.typeBtnActive]}
                onPress={() => set("printerType", "bluetooth")}
              >
                <Ionicons name="bluetooth-outline" size={22} color={settings.printerType === "bluetooth" ? "#fff" : colors.textSecondary} />
                <Text style={[styles.typeBtnText, settings.printerType === "bluetooth" && styles.typeBtnTextActive]}>Bluetooth</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, settings.printerType === "wifi" && styles.typeBtnActive]}
                onPress={() => set("printerType", "wifi")}
              >
                <Ionicons name="wifi-outline" size={22} color={settings.printerType === "wifi" ? "#fff" : colors.textSecondary} />
                <Text style={[styles.typeBtnText, settings.printerType === "wifi" && styles.typeBtnTextActive]}>Wi-Fi / LAN</Text>
              </TouchableOpacity>
            </View>
          </SectionCard>

          {/* Bluetooth section */}
          {settings.printerType === "bluetooth" && (
            <SectionCard title="Bluetooth Printer">
              <View style={styles.selectedRow}>
                <View style={styles.selectedInfo}>
                  <Ionicons name="bluetooth-outline" size={22} color={settings.printerAddress ? colors.primary : colors.textSecondary} />
                  <View style={{ flex: 1 }}>
                    {settings.printerAddress ? (
                      <>
                        <Text style={styles.deviceName}>{settings.printerName || "Unknown Printer"}</Text>
                        <Text style={styles.deviceAddr}>{settings.printerAddress}</Text>
                      </>
                    ) : (
                      <Text style={styles.noDevice}>No printer selected</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity style={styles.scanBtn} onPress={scanDevices}>
                  <Ionicons name="search-outline" size={16} color="#fff" />
                  <Text style={styles.scanBtnText}>Scan</Text>
                </TouchableOpacity>
              </View>
            </SectionCard>
          )}

          {/* WiFi section */}
          {settings.printerType === "wifi" && (
            <SectionCard title="Network Printer">
              <Field label="Printer IP Address">
                <TextInput
                  style={styles.input}
                  value={settings.wifiHost}
                  onChangeText={(v) => set("wifiHost", v)}
                  placeholder="e.g. 192.168.1.100"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  autoCapitalize="none"
                />
              </Field>
              <Field label="Port">
                <TextInput
                  style={styles.input}
                  value={settings.wifiPort}
                  onChangeText={(v) => set("wifiPort", v)}
                  placeholder="9100"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </Field>
            </SectionCard>
          )}

          {/* Paper width + test */}
          <SectionCard title="Paper Settings">
            <Text style={styles.fieldLabel}>Paper Width</Text>
            <View style={styles.chipRow}>
              {PAPER_WIDTHS.map((w) => (
                <TouchableOpacity
                  key={w}
                  style={[styles.chip, settings.paperWidth === w && styles.chipActive]}
                  onPress={() => set("paperWidth", w)}
                >
                  <Text style={[styles.chipText, settings.paperWidth === w && styles.chipTextActive]}>{w}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.testBtn} onPress={testPrint}>
              <Ionicons name="print-outline" size={18} color={colors.primary} />
              <Text style={styles.testBtnText}>Test Print</Text>
            </TouchableOpacity>
          </SectionCard>

          {/* Receipt messages */}
          <SectionCard title="Receipt Messages">
            <Field label="Header">
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={settings.receiptHeader}
                onChangeText={(v) => set("receiptHeader", v)}
                placeholder="Top message on receipt"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={2}
              />
            </Field>
            <Field label="Footer">
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={settings.receiptFooter}
                onChangeText={(v) => set("receiptFooter", v)}
                placeholder="Bottom message on receipt"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={2}
              />
            </Field>
          </SectionCard>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={save}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Ionicons name="checkmark-outline" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Save Settings</Text>
                </>
            }
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bluetooth device picker modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Printer</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {scanning ? (
              <View style={styles.scanningWrap}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.scanningText}>Scanning Bluetooth devices...</Text>
              </View>
            ) : devices.length === 0 ? (
              <View style={styles.scanningWrap}>
                <Ionicons name="bluetooth-outline" size={48} color={colors.border} />
                <Text style={styles.noDeviceText}>No devices found</Text>
                <Text style={styles.noDeviceSub}>Pair your printer in Android Bluetooth{"\n"}settings first, then scan again</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={scanDevices}>
                  <Text style={styles.retryBtnText}>Scan Again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={devices}
                keyExtractor={(item) => item.inner_mac_address}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.deviceRow} onPress={() => selectDevice(item)}>
                    <View style={styles.deviceIcon}>
                      <Ionicons name="print-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deviceName}>{item.device_name || "Unknown"}</Text>
                      <Text style={styles.deviceAddr}>{item.inner_mac_address}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={cardStyles.title}>{title}</Text>
      <View style={cardStyles.card}>{children}</View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={cardStyles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  title: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.md },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  toggleSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", gap: 4 },
  typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeBtnText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
  typeBtnTextActive: { color: "#fff" },
  selectedRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  selectedInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  noDevice: { fontSize: 14, color: colors.textSecondary },
  deviceName: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  deviceAddr: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  scanBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.md },
  scanBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 14, color: colors.textPrimary, backgroundColor: "#FAFAFA" },
  inputMulti: { minHeight: 64, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.xl, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  chipTextActive: { color: "#fff" },
  testBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primaryLight },
  testBtnText: { fontSize: 13, fontWeight: "700", color: colors.primary },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 16, gap: 8, marginBottom: 32 },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "70%", paddingBottom: 30 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  scanningWrap: { alignItems: "center", padding: 40, gap: 12 },
  scanningText: { fontSize: 14, color: colors.textSecondary },
  noDeviceText: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  noDeviceSub: { fontSize: 12, color: colors.textSecondary, textAlign: "center" },
  retryBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: radius.md },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  deviceRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.md },
  deviceIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
});
