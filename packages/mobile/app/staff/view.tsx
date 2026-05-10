import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../lib/api";
import { colors, spacing, radius } from "../../lib/theme";

export default function ViewStaffScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [staff, setStaff] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`users/${id}`).then((d) => {
      if (!d.error) setStaff(d.user);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!staff) return <View style={styles.center}><Text>Not found</Text></View>;

  const rows = [
    { icon: "call-outline", label: "Phone", value: staff.phone },
    { icon: "location-outline", label: "City", value: staff.city },
    { icon: "home-outline", label: "Address", value: staff.address },
    { icon: "business-outline", label: "Bank", value: staff.bank },
    { icon: "git-branch-outline", label: "Branch", value: staff.branch },
    { icon: "card-outline", label: "Account", value: staff.accountNumber },
    { icon: "cash-outline", label: "Salary", value: staff.salary ? `Rs.${staff.salary} / ${staff.salaryPeriod}` : null },
    { icon: "trending-up-outline", label: "Commission", value: staff.commission ? `${staff.commission}%` : null },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{staff.fullName[0]}</Text>
          </View>
          <Text style={styles.name}>{staff.fullName}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{staff.role}</Text>
          </View>
          <Text style={styles.username}>@{staff.username}</Text>
        </View>

        <View style={styles.card}>
          {rows.filter((r) => r.value).map((r, i) => (
            <View key={i} style={[styles.row, i < rows.filter(x => x.value).length - 1 && styles.rowBorder]}>
              <Ionicons name={r.icon as any} size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{r.label}</Text>
                <Text style={styles.rowValue}>{r.value}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => router.push({ pathname: "/staff/edit", params: { id } })}
        >
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.editBtnText}>Edit Staff</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { backgroundColor: colors.primary, alignItems: "center", paddingVertical: 28, paddingHorizontal: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { fontSize: 30, fontWeight: "700", color: "#fff" },
  name: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 6 },
  roleBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12, marginBottom: 4 },
  roleText: { fontSize: 13, fontWeight: "600", color: "#fff", textTransform: "capitalize" },
  username: { fontSize: 13, color: "rgba(255,255,255,0.7)" },
  card: { backgroundColor: colors.white, margin: spacing.md, borderRadius: radius.lg, padding: spacing.md },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  rowValue: { fontSize: 14, color: colors.textPrimary, fontWeight: "500", marginTop: 1 },
  editBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, margin: spacing.md, borderRadius: radius.md, paddingVertical: 14, gap: 8 },
  editBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
