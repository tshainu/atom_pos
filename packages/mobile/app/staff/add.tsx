import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { getUser } from "../../lib/auth";
import { apiFetch } from "../../lib/api";
import { colors, spacing, radius } from "../../lib/theme";

const ROLES = ["admin", "cashier", "salesperson"] as const;
const CITIES = ["Colombo", "Kandy", "Galle", "Jaffna", "Negombo", "Matara", "Kurunegala", "Other"];
const BANKS = ["BOC", "People's Bank", "Sampath", "Commercial", "HNB", "NSB", "Seylan", "Other"];
const PERIODS = ["monthly", "weekly", "daily"];

export default function AddStaffScreen() {
  const [form, setForm] = useState({
    fullName: "", username: "", password: "",
    phone: "", address: "", city: "Colombo",
    bank: "BOC", branch: "", accountNumber: "",
    role: "cashier" as typeof ROLES[number],
    salary: "", salaryPeriod: "monthly", commission: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.fullName.trim() || !form.username.trim() || !form.password.trim()) {
      Alert.alert("Error", "Full name, username and password are required");
      return;
    }
    setSaving(true);
    try {
      const u = await getUser();
      const data = await apiFetch("users", {
        method: "POST",
        body: JSON.stringify({
          shopId: u?.shopId,
          fullName: form.fullName.trim(),
          username: form.username.trim(),
          password: form.password,
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
        }),
      });
      if (data.error) { Alert.alert("Error", data.error); return; }
      Alert.alert("Saved", "Staff added successfully", [{ text: "OK", onPress: () => router.back() }]);
    } catch {
      Alert.alert("Error", "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <SectionCard title="Personal Info">
            <Field label="Full Name *">
              <TextInput style={styles.input} value={form.fullName} onChangeText={(v) => set("fullName", v)} placeholder="Full name" placeholderTextColor={colors.textSecondary} />
            </Field>
            <Field label="Phone">
              <TextInput style={styles.input} value={form.phone} onChangeText={(v) => set("phone", v)} keyboardType="phone-pad" placeholder="07X XXXXXXX" placeholderTextColor={colors.textSecondary} />
            </Field>
            <Field label="Address">
              <TextInput style={styles.input} value={form.address} onChangeText={(v) => set("address", v)} placeholder="Street address" placeholderTextColor={colors.textSecondary} />
            </Field>
            <Field label="City">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CITIES.map((c) => (
                  <TouchableOpacity key={c} style={[styles.chip, form.city === c && styles.chipActive]} onPress={() => set("city", c)}>
                    <Text style={[styles.chipText, form.city === c && styles.chipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Field>
          </SectionCard>

          <SectionCard title="Login Credentials">
            <Field label="Username *">
              <TextInput style={styles.input} value={form.username} onChangeText={(v) => set("username", v)} autoCapitalize="none" placeholder="username" placeholderTextColor={colors.textSecondary} />
            </Field>
            <Field label="Password *">
              <TextInput style={styles.input} value={form.password} onChangeText={(v) => set("password", v)} secureTextEntry placeholder="Set password" placeholderTextColor={colors.textSecondary} />
            </Field>
          </SectionCard>

          <SectionCard title="Role">
            <View style={styles.roleRow}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleBtn, form.role === r && styles.roleBtnActive]}
                  onPress={() => set("role", r)}
                >
                  <Text style={[styles.roleBtnText, form.role === r && styles.roleBtnTextActive]}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SectionCard>

          <SectionCard title="Bank Details">
            <Field label="Bank">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {BANKS.map((b) => (
                  <TouchableOpacity key={b} style={[styles.chip, form.bank === b && styles.chipActive]} onPress={() => set("bank", b)}>
                    <Text style={[styles.chipText, form.bank === b && styles.chipTextActive]}>{b}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Field>
            <Field label="Branch">
              <TextInput style={styles.input} value={form.branch} onChangeText={(v) => set("branch", v)} placeholder="Branch name" placeholderTextColor={colors.textSecondary} />
            </Field>
            <Field label="Account Number">
              <TextInput style={styles.input} value={form.accountNumber} onChangeText={(v) => set("accountNumber", v)} keyboardType="numeric" placeholder="Account number" placeholderTextColor={colors.textSecondary} />
            </Field>
          </SectionCard>

          <SectionCard title="Salary & Commission">
            <View style={styles.twoCol}>
              <Field label="Salary (Rs.)" style={{ flex: 1 }}>
                <TextInput style={styles.input} value={form.salary} onChangeText={(v) => set("salary", v)} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textSecondary} />
              </Field>
              <Field label="Period" style={{ flex: 1 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {PERIODS.map((p) => (
                    <TouchableOpacity key={p} style={[styles.chip, form.salaryPeriod === p && styles.chipActive]} onPress={() => set("salaryPeriod", p)}>
                      <Text style={[styles.chipText, form.salaryPeriod === p && styles.chipTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Field>
            </View>
            <Field label="Commission %">
              <TextInput style={[styles.input, { width: 120 }]} value={form.commission} onChangeText={(v) => set("commission", v)} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textSecondary} />
            </Field>
          </SectionCard>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Staff</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={cardStyles.card}>
      <Text style={cardStyles.title}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: any }) {
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      <Text style={cardStyles.label}>{label}</Text>
      {children}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, marginBottom: 10 },
  title: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 14, color: colors.textPrimary, backgroundColor: "#FAFAFA" },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.xl, backgroundColor: colors.bg, marginRight: 6, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  chipTextActive: { color: "#fff" },
  roleRow: { flexDirection: "row", gap: 8 },
  roleBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: "center" },
  roleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleBtnText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  roleBtnTextActive: { color: "#fff" },
  twoCol: { flexDirection: "row", gap: 12 },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 8, marginBottom: 24 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.danger, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "700", color: colors.danger },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
