import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { apiFetch } from "../../lib/api";
import { colors, spacing, radius } from "../../lib/theme";

const ROLES = ["admin", "cashier", "salesperson"] as const;
const CITIES = ["Colombo", "Kandy", "Galle", "Jaffna", "Negombo", "Matara", "Kurunegala", "Other"];
const BANKS = ["BOC", "People's Bank", "Sampath", "Commercial", "HNB", "NSB", "Seylan", "Other"];
const PERIODS = ["monthly", "weekly", "daily"];

export default function EditStaffScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [form, setForm] = useState({
    fullName: "", username: "", password: "",
    phone: "", address: "", city: "Colombo",
    bank: "BOC", branch: "", accountNumber: "",
    role: "cashier" as typeof ROLES[number],
    salary: "", salaryPeriod: "monthly", commission: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    apiFetch(`users/${id}`).then((d) => {
      if (!d.error) {
        const u = d.user;
        setForm({
          fullName: u.fullName ?? "",
          username: u.username ?? "",
          password: "",
          phone: u.phone ?? "",
          address: u.address ?? "",
          city: u.city ?? "Colombo",
          bank: u.bank ?? "BOC",
          branch: u.branch ?? "",
          accountNumber: u.accountNumber ?? "",
          role: u.role ?? "cashier",
          salary: u.salary?.toString() ?? "",
          salaryPeriod: u.salaryPeriod ?? "monthly",
          commission: u.commission?.toString() ?? "",
        });
      }
      setLoading(false);
    });
  }, [id]);

  const save = async () => {
    if (!form.fullName.trim()) { Alert.alert("Error", "Full name is required"); return; }
    setSaving(true);
    try {
      const data = await apiFetch(`users/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
          city: form.city,
          bank: form.bank,
          branch: form.branch.trim() || undefined,
          accountNumber: form.accountNumber.trim() || undefined,
          role: form.role,
          salary: parseFloat(form.salary) || 0,
          salaryPeriod: form.salaryPeriod,
          commission: parseFloat(form.commission) || 0,
          ...(form.password ? { password: form.password } : {}),
        }),
      });
      if (data.error) { Alert.alert("Error", data.error); return; }
      Alert.alert("Updated", "Staff updated", [{ text: "OK", onPress: () => router.back() }]);
    } catch {
      Alert.alert("Error", "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Personal Info</Text>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput style={styles.input} value={form.fullName} onChangeText={(v) => set("fullName", v)} placeholderTextColor={colors.textSecondary} />
            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} value={form.phone} onChangeText={(v) => set("phone", v)} keyboardType="phone-pad" placeholderTextColor={colors.textSecondary} />
            <Text style={styles.label}>Address</Text>
            <TextInput style={styles.input} value={form.address} onChangeText={(v) => set("address", v)} placeholderTextColor={colors.textSecondary} />
            <Text style={styles.label}>City</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {CITIES.map((c) => (
                <TouchableOpacity key={c} style={[styles.chip, form.city === c && styles.chipActive]} onPress={() => set("city", c)}>
                  <Text style={[styles.chipText, form.city === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>New Password (leave blank to keep)</Text>
            <TextInput style={styles.input} value={form.password} onChangeText={(v) => set("password", v)} secureTextEntry placeholder="New password" placeholderTextColor={colors.textSecondary} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Role</Text>
            <View style={styles.roleRow}>
              {ROLES.map((r) => (
                <TouchableOpacity key={r} style={[styles.roleBtn, form.role === r && styles.roleBtnActive]} onPress={() => set("role", r)}>
                  <Text style={[styles.roleBtnText, form.role === r && styles.roleBtnTextActive]}>{r.charAt(0).toUpperCase() + r.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bank Details</Text>
            <Text style={styles.label}>Bank</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {BANKS.map((b) => (
                <TouchableOpacity key={b} style={[styles.chip, form.bank === b && styles.chipActive]} onPress={() => set("bank", b)}>
                  <Text style={[styles.chipText, form.bank === b && styles.chipTextActive]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.label, { marginTop: 10 }]}>Branch</Text>
            <TextInput style={styles.input} value={form.branch} onChangeText={(v) => set("branch", v)} placeholder="Branch" placeholderTextColor={colors.textSecondary} />
            <Text style={styles.label}>Account Number</Text>
            <TextInput style={styles.input} value={form.accountNumber} onChangeText={(v) => set("accountNumber", v)} keyboardType="numeric" placeholderTextColor={colors.textSecondary} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Salary & Commission</Text>
            <Text style={styles.label}>Salary (Rs.)</Text>
            <TextInput style={[styles.input, { width: 150 }]} value={form.salary} onChangeText={(v) => set("salary", v)} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textSecondary} />
            <Text style={styles.label}>Period</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {PERIODS.map((p) => (
                <TouchableOpacity key={p} style={[styles.chip, form.salaryPeriod === p && styles.chipActive]} onPress={() => set("salaryPeriod", p)}>
                  <Text style={[styles.chipText, form.salaryPeriod === p && styles.chipTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { marginTop: 10 }]}>Commission %</Text>
            <TextInput style={[styles.input, { width: 120 }]} value={form.commission} onChangeText={(v) => set("commission", v)} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textSecondary} />
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Update Staff</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.md },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 14, color: colors.textPrimary, backgroundColor: "#FAFAFA", marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.xl, backgroundColor: colors.bg, marginRight: 6, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  chipTextActive: { color: "#fff" },
  roleRow: { flexDirection: "row", gap: 8 },
  roleBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: "center" },
  roleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleBtnText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  roleBtnTextActive: { color: "#fff" },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 8, marginBottom: 24 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.danger, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "700", color: colors.danger },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
