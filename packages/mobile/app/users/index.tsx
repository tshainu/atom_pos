import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl, Modal, ScrollView,
  KeyboardAvoidingView, Platform, Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getUser } from "../../lib/auth";
import { apiFetch } from "../../lib/api";
import { colors, spacing, radius } from "../../lib/theme";

interface User {
  id: number;
  fullName: string;
  username: string;
  role: string;
  phone: string | null;
  branch: string | null;
  commission: number;
  salary: number;
  salaryPeriod: string;
}

const ROLE_CONFIG: Record<string, { color: string; bg: string; label: string; perms: string[] }> = {
  admin: {
    color: "#7C3AED",
    bg: "#F5F3FF",
    label: "Admin",
    perms: ["Full access", "Manage users", "Manage items", "View all reports", "Change settings"],
  },
  cashier: {
    color: "#0891B2",
    bg: "#F0F9FF",
    label: "Cashier",
    perms: ["Create sales", "View own sales", "Hold/restore bills", "View items"],
  },
  salesperson: {
    color: "#059669",
    bg: "#F0FDF4",
    label: "Salesperson",
    perms: ["Create sales", "View own commission", "View items"],
  },
};

const ROLES = ["admin", "cashier", "salesperson"] as const;

export default function UserManagementScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [filterRole, setFilterRole] = useState<string>("all");

  // Role details modal
  const [roleModal, setRoleModal] = useState(false);

  // Change role modal
  const [changeRoleUser, setChangeRoleUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [savingRole, setSavingRole] = useState(false);

  // Reset password modal
  const [resetPwUser, setResetPwUser] = useState<User | null>(null);
  const [newPw, setNewPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const load = async () => {
    const u = await getUser();
    setCurrentUser(u);
    if (!u) { setLoading(false); return; }
    const data = await apiFetch(`users?shopId=${u.shopId}`);
    if (!data.error) setUsers(data.users ?? []);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const isAdmin = currentUser?.role === "admin";

  const filtered = users.filter((u) => {
    const matchSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const openChangeRole = (u: User) => {
    setChangeRoleUser(u);
    setNewRole(u.role);
  };

  const confirmChangeRole = async () => {
    if (!changeRoleUser || newRole === changeRoleUser.role) { setChangeRoleUser(null); return; }
    setSavingRole(true);
    const data = await apiFetch(`users/${changeRoleUser.id}`, {
      method: "PUT",
      body: JSON.stringify({ role: newRole }),
    });
    setSavingRole(false);
    if (data.error) { Alert.alert("Error", data.error); return; }
    setUsers((prev) => prev.map((u) => u.id === changeRoleUser.id ? { ...u, role: newRole } : u));
    setChangeRoleUser(null);
    Alert.alert("Updated", `${changeRoleUser.fullName} is now ${newRole}`);
  };

  const openResetPw = (u: User) => {
    setResetPwUser(u);
    setNewPw("");
    setShowPw(false);
  };

  const confirmResetPw = async () => {
    if (!resetPwUser || !newPw.trim()) { Alert.alert("Error", "Enter a new password"); return; }
    if (newPw.length < 4) { Alert.alert("Error", "Password must be at least 4 characters"); return; }
    setSavingPw(true);
    const data = await apiFetch(`users/${resetPwUser.id}`, {
      method: "PUT",
      body: JSON.stringify({ password: newPw }),
    });
    setSavingPw(false);
    if (data.error) { Alert.alert("Error", data.error); return; }
    setResetPwUser(null);
    Alert.alert("Done", `Password updated for ${resetPwUser.fullName}`);
  };

  const toggleDisable = (u: User) => {
    Alert.alert(
      "Disable User",
      `This will prevent ${u.fullName} from logging in. (Feature: set inactive flag)`,
      [{ text: "OK" }]
    );
  };

  const deleteUser = (u: User) => {
    if (u.id === currentUser?.id) { Alert.alert("Error", "You cannot delete your own account"); return; }
    Alert.alert("Delete User", `Permanently remove "${u.fullName}"?\nThis cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          const data = await apiFetch(`users/${u.id}`, { method: "DELETE" });
          if (data.error) { Alert.alert("Error", data.error); return; }
          setUsers((prev) => prev.filter((x) => x.id !== u.id));
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>

      {/* Search + filter */}
      <View style={styles.topBar}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search users..."
            placeholderTextColor={colors.textSecondary}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.infoBtn} onPress={() => setRoleModal(true)}>
          <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Role filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {["all", ...ROLES].map((r) => {
          const cfg = r !== "all" ? ROLE_CONFIG[r] : null;
          return (
            <TouchableOpacity
              key={r}
              style={[styles.filterChip, filterRole === r && { backgroundColor: cfg?.color ?? colors.primary, borderColor: cfg?.color ?? colors.primary }]}
              onPress={() => setFilterRole(r)}
            >
              <Text style={[styles.filterChipText, filterRole === r && { color: "#fff" }]}>
                {r === "all" ? `All (${users.length})` : `${ROLE_CONFIG[r].label} (${users.filter((u) => u.role === r).length})`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(u) => u.id.toString()}
        contentContainerStyle={{ padding: spacing.md, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item: u }) => {
          const cfg = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.cashier;
          const isSelf = u.id === currentUser?.id;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.avatar, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.avatarText, { color: cfg.color }]}>{u.fullName[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.userName}>{u.fullName}</Text>
                    {isSelf && (
                      <View style={styles.youBadge}>
                        <Text style={styles.youBadgeText}>You</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.userUsername}>@{u.username}</Text>
                  {u.phone ? <Text style={styles.userMeta}>{u.phone}</Text> : null}
                </View>
                <View style={[styles.rolePill, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.rolePillText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>

              {/* Quick stats */}
              <View style={styles.statsRow}>
                <StatBox label="Commission" value={`${u.commission ?? 0}%`} />
                <StatBox label="Salary" value={`Rs.${(u.salary ?? 0).toLocaleString()}`} />
                <StatBox label="Period" value={capitalize(u.salaryPeriod ?? "monthly")} />
              </View>

              {/* Actions — admin only */}
              {isAdmin && (
                <View style={styles.actionsRow}>
                  <ActionBtn
                    icon="shield-outline"
                    label="Role"
                    color={cfg.color}
                    onPress={() => openChangeRole(u)}
                  />
                  <ActionBtn
                    icon="key-outline"
                    label="Reset PW"
                    color="#F59E0B"
                    onPress={() => openResetPw(u)}
                  />
                  <ActionBtn
                    icon="create-outline"
                    label="Edit"
                    color={colors.primary}
                    onPress={() => router.push({ pathname: "/staff/edit", params: { id: u.id } })}
                  />
                  {!isSelf && (
                    <ActionBtn
                      icon="trash-outline"
                      label="Delete"
                      color={colors.danger}
                      onPress={() => deleteUser(u)}
                    />
                  )}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={colors.border} />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />

      {/* Add user FAB — admin only */}
      {isAdmin && (
        <TouchableOpacity style={styles.fab} onPress={() => router.push("/staff/add")}>
          <Ionicons name="person-add-outline" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Role Permissions Modal */}
      <Modal visible={roleModal} transparent animationType="slide" onRequestClose={() => setRoleModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setRoleModal(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Role Permissions</Text>
          <ScrollView>
            {ROLES.map((role) => {
              const cfg = ROLE_CONFIG[role];
              return (
                <View key={role} style={[styles.roleCard, { borderLeftColor: cfg.color }]}>
                  <View style={[styles.roleBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.roleBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  {cfg.perms.map((p) => (
                    <View key={p} style={styles.permRow}>
                      <Ionicons name="checkmark-circle-outline" size={16} color={cfg.color} />
                      <Text style={styles.permText}>{p}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={() => setRoleModal(false)}>
            <Text style={styles.modalBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Change Role Modal */}
      <Modal visible={!!changeRoleUser} transparent animationType="slide" onRequestClose={() => setChangeRoleUser(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setChangeRoleUser(null)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Change Role</Text>
          <Text style={styles.modalSub}>{changeRoleUser?.fullName}</Text>
          <View style={styles.roleSelectList}>
            {ROLES.map((r) => {
              const cfg = ROLE_CONFIG[r];
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleSelectItem, newRole === r && { borderColor: cfg.color, backgroundColor: cfg.bg }]}
                  onPress={() => setNewRole(r)}
                >
                  <View style={[styles.roleSelectDot, { backgroundColor: newRole === r ? cfg.color : colors.border }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.roleSelectLabel, newRole === r && { color: cfg.color }]}>{cfg.label}</Text>
                    <Text style={styles.roleSelectSub}>{cfg.perms.slice(0, 2).join(" • ")}</Text>
                  </View>
                  {newRole === r && <Ionicons name="checkmark-circle" size={20} color={cfg.color} />}
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.modalBtnRow}>
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnOutline]} onPress={() => setChangeRoleUser(null)}>
              <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.primary, flex: 1.5 }, savingRole && { opacity: 0.7 }]}
              onPress={confirmChangeRole}
              disabled={savingRole}
            >
              {savingRole
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.modalBtnText}>Confirm</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reset Password Modal */}
      <Modal visible={!!resetPwUser} transparent animationType="slide" onRequestClose={() => setResetPwUser(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setResetPwUser(null)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSub}>{resetPwUser?.fullName} — @{resetPwUser?.username}</Text>
            <View style={styles.pwInputWrap}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={newPw}
                onChangeText={setNewPw}
                placeholder="New password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPw}
                autoFocus
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.pwHint}>Minimum 4 characters</Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnOutline]} onPress={() => setResetPwUser(null)}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#F59E0B", flex: 1.5 }, savingPw && { opacity: 0.7 }]}
                onPress={confirmResetPw}
                disabled={savingPw}
              >
                {savingPw
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalBtnText}>Update Password</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={statStyles.box}>
      <Text style={statStyles.val}>{value}</Text>
      <Text style={statStyles.lbl}>{label}</Text>
    </View>
  );
}

function ActionBtn({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[actionStyles.btn, { backgroundColor: color + "15" }]} onPress={onPress}>
      <Ionicons name={icon as any} size={16} color={color} />
      <Text style={[actionStyles.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function capitalize(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

const statStyles = StyleSheet.create({
  box: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.bg },
  val: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  lbl: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
});

const actionStyles = StyleSheet.create({
  btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8, borderRadius: radius.md },
  label: { fontSize: 11, fontWeight: "700" },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: { flexDirection: "row", alignItems: "center", margin: spacing.md, gap: 8 },
  searchBar: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: colors.white, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },
  infoBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  filterRow: { paddingHorizontal: spacing.md, paddingBottom: 8, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  filterChipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  card: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  userName: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  youBadge: { paddingHorizontal: 6, paddingVertical: 1, backgroundColor: "#FEF3C7", borderRadius: 4 },
  youBadgeText: { fontSize: 10, fontWeight: "700", color: "#D97706" },
  userUsername: { fontSize: 12, color: colors.textSecondary },
  userMeta: { fontSize: 12, color: colors.textSecondary },
  rolePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  rolePillText: { fontSize: 11, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  actionsRow: { flexDirection: "row", gap: 6 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: colors.textSecondary },
  fab: {
    position: "absolute", bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
    shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.lg, paddingBottom: 36,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 },
  modalSub: { fontSize: 13, color: colors.textSecondary, marginBottom: 16 },
  roleCard: { borderLeftWidth: 3, paddingLeft: 12, marginBottom: 16 },
  roleBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, marginBottom: 6 },
  roleBadgeText: { fontSize: 12, fontWeight: "700" },
  permRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  permText: { fontSize: 13, color: colors.textSecondary },
  roleSelectList: { gap: 8, marginBottom: 20 },
  roleSelectItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    padding: 12,
  },
  roleSelectDot: { width: 12, height: 12, borderRadius: 6 },
  roleSelectLabel: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  roleSelectSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  modalBtnRow: { flexDirection: "row", gap: 10 },
  modalBtn: {
    flex: 1, paddingVertical: 14, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
  },
  modalBtnOutline: { borderWidth: 1.5, borderColor: colors.border },
  modalBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  pwInputWrap: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 8 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    fontSize: 14, color: colors.textPrimary, backgroundColor: "#FAFAFA",
  },
  eyeBtn: { padding: 8 },
  pwHint: { fontSize: 12, color: colors.textSecondary, marginBottom: 20 },
});
