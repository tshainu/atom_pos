import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getUser, saveSession, getToken } from "../../lib/auth";
import { apiFetch } from "../../lib/api";
import { colors, spacing, radius } from "../../lib/theme";

export default function BusinessInfoScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopPhone, setShopPhone] = useState("");

  useEffect(() => {
    getUser().then((u: any) => {
      setUser(u);
      setShopName(u?.shopName ?? "");
      setShopAddress(u?.shopAddress ?? "");
      setShopPhone(u?.shopPhone ?? "");
    });
    setLoading(false); // User is from local cache — no flicker
  }, []);

  const save = async () => {
    if (!shopName.trim()) { Alert.alert("Error", "Shop name is required"); return; }
    if (!user?.shopId) { Alert.alert("Error", "Shop ID not found"); return; }
    setSaving(true);
    try {
      const data = await apiFetch(`shops/${user.shopId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: shopName.trim(),
          address: shopAddress.trim(),
          phone: shopPhone.trim(),
        }),
      });
      if (data.error) { Alert.alert("Error", data.error); return; }

      // Update local session
      const token = await getToken();
      if (token) {
        await saveSession(token, {
          ...user,
          shopName: shopName.trim(),
          shopAddress: shopAddress.trim(),
          shopPhone: shopPhone.trim(),
        });
      }
      Alert.alert("Saved", "Business information updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Error", "Failed to save. Check connection.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>Business Information</Text>
          </View>

          <Text style={styles.subtitle}>
            This info appears on printed receipts and bills.
          </Text>

          {/* Form */}
          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <View style={styles.fieldIconRow}>
                <View style={[styles.fieldIcon, { backgroundColor: "#FFF7ED" }]}>
                  <Ionicons name="storefront-outline" size={18} color="#EA580C" />
                </View>
                <Text style={styles.fieldLabel}>Shop Name</Text>
              </View>
              <TextInput
                style={[styles.input, styles.readOnly]}
                value={shopName}
                editable={false}
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={styles.readOnlyHint}>Only editable by super admin</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldGroup}>
              <View style={styles.fieldIconRow}>
                <View style={[styles.fieldIcon, { backgroundColor: "#EFF6FF" }]}>
                  <Ionicons name="location-outline" size={18} color="#2563EB" />
                </View>
                <Text style={styles.fieldLabel}>Address</Text>
              </View>
              <TextInput
                style={[styles.input, styles.multilineInput, styles.readOnly]}
                value={shopAddress}
                editable={false}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={2}
              />
              <Text style={styles.readOnlyHint}>Only editable by super admin</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldGroup}>
              <View style={styles.fieldIconRow}>
                <View style={[styles.fieldIcon, { backgroundColor: "#F0FDF4" }]}>
                  <Ionicons name="call-outline" size={18} color="#16A34A" />
                </View>
                <Text style={styles.fieldLabel}>Phone Number</Text>
              </View>
              <TextInput
                style={styles.input}
                value={shopPhone}
                onChangeText={setShopPhone}
                placeholder="e.g. +94 77 123 4567"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Preview */}
          <Text style={styles.previewLabel}>Receipt Preview</Text>
          <View style={styles.receiptPreview}>
            <Text style={styles.previewShopName}>{shopName || "Shop Name"}</Text>
            {shopAddress ? <Text style={styles.previewLine}>{shopAddress}</Text> : null}
            {shopPhone ? <Text style={styles.previewLine}>Tel: {shopPhone}</Text> : null}
            <Text style={styles.previewDash}>- - - - - - - - - - - - - - -</Text>
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={save}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </>
            }
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.md, paddingBottom: 40 },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 },
  backBtn: { padding: 4 },
  pageTitle: { fontSize: 20, fontWeight: "800", color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 20, lineHeight: 19 },

  card: {
    backgroundColor: colors.white, borderRadius: radius.lg, marginBottom: 24,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    overflow: "hidden",
  },
  fieldGroup: { padding: spacing.md },
  fieldIconRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  fieldIcon: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    color: colors.textPrimary, backgroundColor: "#fafafa",
  },
  multilineInput: { minHeight: 56, textAlignVertical: "top" },
  divider: { height: 1, backgroundColor: colors.border },

  previewLabel: {
    fontSize: 11, fontWeight: "700", color: colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 1.2,
    marginBottom: 8,
  },
  receiptPreview: {
    backgroundColor: "#fffef5", borderRadius: radius.lg, padding: 16,
    borderWidth: 1, borderColor: "#e5e3c8", marginBottom: 24,
    alignItems: "center",
  },
  previewShopName: { fontSize: 15, fontWeight: "800", color: "#222", marginBottom: 3 },
  previewLine: { fontSize: 12, color: "#555", marginBottom: 1 },
  previewDash: { fontSize: 11, color: "#bbb", letterSpacing: 2, marginTop: 8 },

  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: 15,
  },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  readOnly: { backgroundColor: "#f0f0f0", color: colors.textSecondary, opacity: 0.75 },
  readOnlyHint: { fontSize: 11, color: colors.textSecondary, marginTop: 4, fontStyle: "italic" },
});
