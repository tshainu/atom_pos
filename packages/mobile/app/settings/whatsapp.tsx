import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getUser } from "../../lib/auth";
import { apiFetch, cachedFetchAsync } from "../../lib/api";
import { colors, spacing, radius } from "../../lib/theme";

export default function WhatsAppSettingsScreen() {
  const [user, setUser] = useState<any>(null);
  const [phone, setPhone] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const applyData = (data: any) => {
    if (!data?.error && data?.settings) {
      setPhone(data.settings.whatsappPhone ?? "");
      setEnabled(data.settings.whatsappEnabled ?? false);
    }
  };

  const load = async () => {
    const u = await getUser();
    setUser(u);
    if (!u) { setLoading(false); return; }
    const cached = await cachedFetchAsync(`settings/${u.shopId}`);
    if (cached) { applyData(cached); setLoading(false); }
    apiFetch(`settings/${u.shopId}`).then((data) => { applyData(data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);
  useFocusEffect(useCallback(() => { load(); }, []));

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const data = await apiFetch(`settings/${user.shopId}`, {
        method: "PUT",
        body: JSON.stringify({
          whatsappPhone: phone.trim(),
          whatsappEnabled: enabled,
        }),
      });
      if (data?.error) {
        Alert.alert("Error", data.error);
      } else {
        Alert.alert("Saved", "WhatsApp settings updated.");
      }
    } catch {
      Alert.alert("Error", "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !phone) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={{ padding: 16, gap: 14 }}>
          {[1,2].map((i) => <View key={i} style={{ height: 80, borderRadius: 12, backgroundColor: "#e8e8e8" }} />)}
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
        <Text style={styles.headerTitle}>WhatsApp Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Info box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#0891B2" />
          <Text style={styles.infoText}>
            When sending bills via WhatsApp, the app opens WhatsApp with a pre-filled message.
            For credit sales, the customer's phone number is used. Set a default number here as fallback.
          </Text>
        </View>

        <View style={styles.card}>
          {/* Enable toggle */}
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: "#DCFCE7" }]}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Enable WhatsApp Bills</Text>
              <Text style={styles.rowSub}>Show WhatsApp button on receipt</Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: "#e0e0e0", true: "#25D36688" }}
              thumbColor={enabled ? "#25D366" : "#f0f0f0"}
            />
          </View>

          <View style={styles.divider} />

          {/* Phone input */}
          <View style={styles.fieldRow}>
            <View style={[styles.iconWrap, { backgroundColor: "#E0F2FE" }]}>
              <Ionicons name="phone-portrait-outline" size={20} color="#0891B2" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Default WhatsApp Number</Text>
              <Text style={styles.rowSub}>With country code, e.g. 94771234567</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="94771234567"
                placeholderTextColor="#aaa"
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        {/* Example preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Message Preview</Text>
          <Text style={styles.previewText}>
            {`*Shop Name*\nBill: BILL-0001\nDate: 01.01.25 10:30\n\n1. Item Name x2 = Rs.500\n\nSubtotal: Rs.500\n*Net Pay: Rs.500*`}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Save Settings</Text>
              </>}
        </TouchableOpacity>
      </ScrollView>
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
  scroll: { padding: spacing.md, paddingBottom: 40, gap: 16 },

  infoBox: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    backgroundColor: "#E0F2FE", borderRadius: radius.md, padding: spacing.md,
  },
  infoText: { flex: 1, fontSize: 13, color: "#0369a1", lineHeight: 18 },

  card: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: 14, gap: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },
  fieldRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: spacing.md, paddingVertical: 14, gap: 12 },
  input: {
    marginTop: 8, borderWidth: 1, borderColor: "#ddd", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 15,
    color: colors.textPrimary, backgroundColor: "#fafafa",
  },

  previewCard: {
    backgroundColor: "#fffef8", borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: "#e0e0e0",
  },
  previewTitle: { fontSize: 12, fontWeight: "700", color: "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 },
  previewText: { fontSize: 12, color: "#333", lineHeight: 18, fontFamily: "monospace" as any },

  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#25D366", borderRadius: radius.md, paddingVertical: 14,
    shadowColor: "#25D366", shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
