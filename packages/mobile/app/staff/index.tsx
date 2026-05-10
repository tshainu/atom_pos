import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getUser } from "../../lib/auth";
import { apiFetch } from "../../lib/api";
import { colors, spacing, radius } from "../../lib/theme";

interface StaffUser {
  id: number;
  fullName: string;
  role: string;
  branch: string | null;
  phone: string | null;
  commission: number;
}

const roleColors: Record<string, string> = {
  admin: "#7C3AED",
  cashier: "#0891B2",
  salesperson: "#059669",
};

export default function StaffScreen() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

  const load = async () => {
    const u = await getUser();
    setUser(u);
    if (!u) return;
    const data = await apiFetch(`users?shopId=${u.shopId}`);
    if (!data.error) setStaff(data.users);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const deleteStaff = (s: StaffUser) => {
    Alert.alert("Delete Staff", `Remove "${s.fullName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await apiFetch(`users/${s.id}`, { method: "DELETE" });
          setStaff((prev) => prev.filter((u) => u.id !== s.id));
        },
      },
    ]);
  };

  const filtered = staff.filter((s) =>
    s.fullName.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search staff..."
          placeholderTextColor={colors.textSecondary}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id.toString()}
        contentContainerStyle={{ padding: spacing.md, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item: s }) => (
          <View style={styles.staffCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{s.fullName[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.staffName}>{s.fullName}</Text>
              <View style={styles.metaRow}>
                <View style={[styles.roleBadge, { backgroundColor: (roleColors[s.role] ?? colors.primary) + "20" }]}>
                  <Text style={[styles.roleText, { color: roleColors[s.role] ?? colors.primary }]}>
                    {s.role}
                  </Text>
                </View>
                {s.branch && <Text style={styles.branchText}>{s.branch}</Text>}
              </View>
              {s.phone && <Text style={styles.phoneText}>{s.phone}</Text>}
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push({ pathname: "/staff/view", params: { id: s.id } })}
              >
                <Ionicons name="eye-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push({ pathname: "/staff/edit", params: { id: s.id } })}
              >
                <Ionicons name="create-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => deleteStaff(s)}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={colors.border} />
            <Text style={styles.emptyText}>No staff found</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/staff/add")}>
              <Text style={styles.emptyBtnText}>Add First Staff</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push("/staff/add")}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  searchBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.white, margin: spacing.md,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },
  staffCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.white, borderRadius: radius.lg,
    padding: spacing.md, gap: 12,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: colors.primary },
  staffName: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  roleText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  branchText: { fontSize: 12, color: colors.textSecondary },
  phoneText: { fontSize: 12, color: colors.textSecondary },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center",
  },
  deleteBtn: { backgroundColor: "#FEE2E2" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: colors.textSecondary },
  emptyBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 24, paddingVertical: 10 },
  emptyBtnText: { color: "#fff", fontWeight: "700" },
  fab: {
    position: "absolute", bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
    shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
});
