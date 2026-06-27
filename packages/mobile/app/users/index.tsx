import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl, Modal, ScrollView,
  KeyboardAvoidingView, Platform,
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
  suspended?: boolean;
  city?: string;
  bank?: string;
  accountNumber?: string;
  address?: string;
}

const ROLE_CONFIG: Record<string, { color: string; bg: string; label: string; perms: string[] }> = {
  admin: {
    color: "#7C3AED", bg: "#F5F3FF", label: "Admin",
    perms: ["Full access", "Manage users", "Manage items", "View all reports", "Change settings"],
  },
  cashier: {
    color: "#0891B2", bg: "#F0F9FF", label: "Cashier",
    perms: ["Create sales", "View own sales", "Hold/restore bills", "View items"],
  },
  salesperson: {
    color: "#059669", bg: "#F0FDF4", label: "Salesperson",
    perms: ["Create sales", "View own commission", "View items"],
  },
};

const ROLES = ["admin", "cashier", "salesperson"] as const;
const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "admin", label: "Admin" },
  { key: "cashier", label: "Cashier" },
  { key: "salesperson", label: "Salesperson" },
];

export default function UserManagementScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [filterRole, setFilterRole] = useState<string>("all");

  // Role info modal
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

  // View detail modal
  const [viewUser, setViewUser] = useState<User | null>(null);

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
    const q = search.toLowerCase();
    const matchSearch = !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.phone ?? "").includes(q);
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const roleCounts = ROLES.reduce((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length;
    return acc;
  }, {} as Record<string, number>);

  const confirmChangeRole = async () => {
    if (!changeRoleUser || newRole === changeRoleUser.role) { setChangeRoleUser(null); return; }
    setSavingRole(true);
    const data = await apiFetch(`users/${changeRoleUser.id}`, {
      method: "PUT",
      body: JSON.stringify({ role: newRole }),
    });
    setSavingRole(false);
    if (data.error) { Alert.alert("Error", data.error); return; }
    setUsers(prev => prev.map(u => u.id === changeRoleUser.id ? { ...u, role: newRole } : u));
    setChangeRoleUser(null);
    Alert.alert("Updated", `${changeRoleUser.fullName} is now ${ROLE_CONFIG[newRole]?.label ?? newRole}`);
  };

  const confirmResetPw = async () => {
    if (!resetPwUser || !newPw.trim()) { Alert.alert("Error", "Enter a new password"); return; }
    if (newPw.length < 4) { Alert.alert("Error", "Minimum 4 characters"); return; }
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

  const toggleSuspend = (u: User) => {
    if (u.id === currentUser?.id) { Alert.alert("Error", "You cannot suspend your own account"); return; }
    const action = u.suspended ? "Activate" : "Suspend";
    Alert.alert(
      `${action} User`,
      `${action} "${u.fullName}"?\n${u.suspended ? "They will be able to log in again." : "They will not be able to log in."}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action, style: u.suspended ? "default" : "destructive",
          onPress: async () => {
            const data = await apiFetch(`users/${u.id}`, {
              method: "PUT",
              body: JSON.stringify({ suspended: !u.suspended }),
            });
            if (data.error) { Alert.alert("Error", data.error); return; }
            setUsers(prev => prev.map(x => x.id === u.id ? { ...x, suspended: !u.suspended } : x));
          },
        },
      ]
    );
  };

  const deleteUser = (u: User) => {
    if (u.id === currentUser?.id) { Alert.alert("Error", "You cannot delete your own account"); return; }
    Alert.alert("Delete User", `Permanently remove "${u.fullName}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          const data = await apiFetch(`users/${u.id}`, { method: "DELETE" });
          if (data.error) { Alert.alert("Error", data.error); return; }
          setUsers(prev => prev.filter(x => x.id !== u.id));
        },
      },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>

      {/* Search bar */}
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
        <TouchableOpacity style={styles.iconBtn} onPress={() => setRoleModal(true)}>
          <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Role filter chips — horizontal row, fixed height */}
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTER_TABS.map(({ key, label }) => {
            const cfg = key !== "all" ? ROLE_CONFIG[key] : null;
            const count = key === "all" ? users.length : (roleCounts[key] ?? 0);
            const active = filterRole === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.filterChip,
                  active && { backgroundColor: cfg?.color ?? colors.primary, borderColor: cfg?.color ?? colors.primary },
                ]}
                onPress={() => setFilterRole(key)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* User list */}
      <FlatList
        data={filtered}
        keyExtractor={u => u.id.toString()}
        contentContainerStyle={{ padding: spacing.md, gap: 10, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item: u }) => {
          const cfg = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.cashier;
          const isSelf = u.id === currentUser?.id;
          return (
            <View style={[styles.card, u.suspended && styles.cardSuspended]}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <TouchableOpacity onPress={() => setViewUser(u)} activeOpacity={0.7}>
                  <View style={[styles.avatar, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.avatarText, { color: cfg.color }]}>{u.fullName[0]?.toUpperCase()}</Text>
                  </View>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.userName}>{u.fullName}</Text>
                    {isSelf && <View style={styles.youBadge}><Text style={styles.youBadgeText}>You</Text></View>}
                    {u.suspended && <View style={styles.suspendedBadge}><Text style={styles.suspendedText}>Suspended</Text></View>}
                  </View>
                  <Text style={styles.userSub}>@{u.username}{u.phone ? `  ·  ${u.phone}` : ""}</Text>
                </View>
                <View style={[styles.rolePill, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.rolePillText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <StatBox label="Commission" value={`${u.commission ?? 0}%`} />
                <StatBox label="Salary" value={`Rs.${(u.salary ?? 0).toLocaleString()}`} />
                <StatBox label="Period" value={capitalize(u.salaryPeriod ?? "monthly")} />
              </View>

              {/* Actions */}
              {isAdmin && (
                <View style={styles.actionsRow}>
                  <ActionBtn icon="shield-outline" label="Role" color={cfg.color} onPress={() => { setChangeRoleUser(u); setNewRole(u.role); }} />
                  <ActionBtn icon="key-outline" label="Reset PW" color="#F59E0B" onPress={() => { setResetPwUser(u); setNewPw(""); setShowPw(false); }} />
                  <ActionBtn icon="create-outline" label="Edit" color={colors.primary} onPress={() => router.push({ pathname: "/staff/edit", params: { id: u.id } })} />
                  {!isSelf && (
                    <ActionBtn
                      icon={u.suspended ? "play-circle-outline" : "pause-circle-outline"}
                      label={u.suspended ? "Activate" : "Suspend"}
                      color={u.suspended ? "#16a34a" : "#EA580C"}
                      onPress={() => toggleSuspend(u)}
                    />
                  )}
                  {!isSelf && (
                    <ActionBtn icon="trash-outline" label="Delete" color={colors.danger} onPress={() => deleteUser(u)} />
                  )}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={52} color={colors.border} />
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptyText}>{search ? "Try a different search" : "Add staff using the + button"}</Text>
          </View>
        }
      />

      {/* FAB */}
      {isAdmin && (
        <TouchableOpacity style={styles.fab} onPress={() => router.push("/staff/add")}>
          <Ionicons name="person-add-outline" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ── Role Permissions Modal ── */}
      <Modal visible={roleModal} transparent animationType="slide" onRequestClose={() => setRoleModal(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setRoleModal(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Role Permissions</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {ROLES.map(role => {
                const cfg = ROLE_CONFIG[role];
                return (
                  <View key={role} style={[styles.roleCard, { borderLeftColor: cfg.color }]}>
                    <View style={[styles.roleBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.roleBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    {cfg.perms.map(p => (
                      <View key={p} style={styles.permRow}>
                        <Ionicons name="checkmark-circle" size={15} color={cfg.color} />
                        <Text style={styles.permText}>{p}</Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: colors.primary }]} onPress={() => setRoleModal(false)}>
              <Text style={styles.sheetBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Change Role Modal ── */}
      <Modal visible={!!changeRoleUser} transparent animationType="slide" onRequestClose={() => setChangeRoleUser(null)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setChangeRoleUser(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Change Role</Text>
            <Text style={styles.sheetSub}>{changeRoleUser?.fullName} · @{changeRoleUser?.username}</Text>
            <View style={{ gap: 8, marginBottom: 20 }}>
              {ROLES.map(r => {
                const cfg = ROLE_CONFIG[r];
                const active = newRole === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleSelectItem, active && { borderColor: cfg.color, backgroundColor: cfg.bg }]}
                    onPress={() => setNewRole(r)}
                  >
                    <View style={[styles.roleSelectDot, { backgroundColor: active ? cfg.color : colors.border }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.roleSelectLabel, active && { color: cfg.color }]}>{cfg.label}</Text>
                      <Text style={styles.roleSelectSub}>{cfg.perms.slice(0, 2).join(" · ")}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={20} color={cfg.color} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.sheetBtn, styles.sheetBtnOutline, { flex: 1 }]} onPress={() => setChangeRoleUser(null)}>
                <Text style={[styles.sheetBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetBtn, { backgroundColor: colors.primary, flex: 1.5 }, savingRole && { opacity: 0.7 }]}
                onPress={confirmChangeRole} disabled={savingRole}
              >
                {savingRole
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.sheetBtnText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Reset Password Modal ── */}
      <Modal visible={!!resetPwUser} transparent animationType="slide" onRequestClose={() => setResetPwUser(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setResetPwUser(null)} />
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Reset Password</Text>
              <Text style={styles.sheetSub}>{resetPwUser?.fullName} · @{resetPwUser?.username}</Text>
              <View style={styles.pwRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newPw}
                  onChangeText={setNewPw}
                  placeholder="New password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPw}
                  autoFocus
                />
                <TouchableOpacity onPress={() => setShowPw(s => !s)} style={styles.eyeBtn}>
                  <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>Minimum 4 characters</Text>
              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.sheetBtn, styles.sheetBtnOutline, { flex: 1 }]} onPress={() => setResetPwUser(null)}>
                  <Text style={[styles.sheetBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sheetBtn, { backgroundColor: "#F59E0B", flex: 1.5 }, savingPw && { opacity: 0.7 }]}
                  onPress={confirmResetPw} disabled={savingPw}
                >
                  {savingPw
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.sheetBtnText}>Update</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── View User Detail Modal ── */}
      <Modal visible={!!viewUser} transparent animationType="slide" onRequestClose={() => setViewUser(null)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setViewUser(null)} />
          <View style={[styles.sheet, { paddingBottom: 40 }]}>
            <View style={styles.sheetHandle} />
            {viewUser && (() => {
              const cfg = ROLE_CONFIG[viewUser.role] ?? ROLE_CONFIG.cashier;
              return (
                <>
                  <View style={styles.viewHeader}>
                    <View style={[styles.viewAvatar, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.viewAvatarText, { color: cfg.color }]}>{viewUser.fullName[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.viewName}>{viewUser.fullName}</Text>
                      <Text style={styles.viewSub}>@{viewUser.username}</Text>
                      <View style={[styles.rolePill, { backgroundColor: cfg.bg, alignSelf: "flex-start", marginTop: 4 }]}>
                        <Text style={[styles.rolePillText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.detailGrid}>
                    <DetailRow icon="call-outline" label="Phone" value={viewUser.phone || "—"} />
                    <DetailRow icon="location-outline" label="City" value={viewUser.city || "—"} />
                    <DetailRow icon="home-outline" label="Address" value={viewUser.address || "—"} />
                    <DetailRow icon="business-outline" label="Bank" value={viewUser.bank ? `${viewUser.bank}${viewUser.branch ? ` · ${viewUser.branch}` : ""}` : "—"} />
                    <DetailRow icon="card-outline" label="Account" value={viewUser.accountNumber || "—"} />
                    <DetailRow icon="cash-outline" label="Salary" value={`Rs.${(viewUser.salary ?? 0).toLocaleString()} / ${capitalize(viewUser.salaryPeriod ?? "monthly")}`} />
                    <DetailRow icon="trending-up-outline" label="Commission" value={`${viewUser.commission ?? 0}%`} />
                  </View>
                  <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: colors.primary, marginTop: 8 }]} onPress={() => setViewUser(null)}>
                    <Text style={styles.sheetBtnText}>Close</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>
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
    <TouchableOpacity style={[actionStyles.btn, { backgroundColor: color + "18" }]} onPress={onPress}>
      <Ionicons name={icon as any} size={15} color={color} />
      <Text style={[actionStyles.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={detailStyles.row}>
      <Ionicons name={icon as any} size={16} color={colors.textSecondary} style={{ width: 22 }} />
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={detailStyles.value} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function capitalize(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

const statStyles = StyleSheet.create({
  box: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.bg },
  val: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  lbl: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
});

const actionStyles = StyleSheet.create({
  btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 7, borderRadius: radius.md, minWidth: 0 },
  label: { fontSize: 10, fontWeight: "700" },
});

const detailStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 },
  label: { fontSize: 12, color: colors.textSecondary, width: 72 },
  value: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.textPrimary, textAlign: "right" },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  topBar: { flexDirection: "row", alignItems: "center", marginHorizontal: spacing.md, marginTop: spacing.sm, marginBottom: 8, gap: 8 },
  searchBar: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: colors.white, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },
  iconBtn: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },

  // Filter row — constrained height so it doesn't expand like a card
  filterWrap: { height: 44, marginBottom: 4 },
  filterRow: { paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white,
  },
  filterChipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  filterChipTextActive: { color: "#fff" },

  // Cards
  card: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardSuspended: { opacity: 0.65, borderLeftWidth: 3, borderLeftColor: "#EA580C" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 19, fontWeight: "700" },
  nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 3 },
  userName: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  youBadge: { paddingHorizontal: 6, paddingVertical: 1, backgroundColor: "#FEF3C7", borderRadius: 4 },
  youBadgeText: { fontSize: 10, fontWeight: "700", color: "#D97706" },
  suspendedBadge: { paddingHorizontal: 6, paddingVertical: 1, backgroundColor: "#FEE2E2", borderRadius: 4 },
  suspendedText: { fontSize: 10, fontWeight: "700", color: "#DC2626" },
  userSub: { fontSize: 12, color: colors.textSecondary },
  rolePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  rolePillText: { fontSize: 11, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  actionsRow: { flexDirection: "row", gap: 5 },

  // Empty state
  empty: { alignItems: "center", paddingTop: 70, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  emptyText: { fontSize: 13, color: colors.textSecondary },

  // FAB
  fab: {
    position: "absolute", bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
    shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },

  // Bottom sheet
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.lg, paddingBottom: 32, maxHeight: "88%",
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 18 },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 },
  sheetSub: { fontSize: 13, color: colors.textSecondary, marginBottom: 16 },
  sheetBtn: {
    paddingVertical: 14, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
  },
  sheetBtnOutline: { borderWidth: 1.5, borderColor: colors.border },
  sheetBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  btnRow: { flexDirection: "row", gap: 10 },

  // Role cards in permissions modal
  roleCard: { borderLeftWidth: 3, paddingLeft: 12, marginBottom: 16 },
  roleBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, marginBottom: 6 },
  roleBadgeText: { fontSize: 12, fontWeight: "700" },
  permRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  permText: { fontSize: 13, color: colors.textSecondary },

  // Role select list
  roleSelectItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: 12,
  },
  roleSelectDot: { width: 12, height: 12, borderRadius: 6 },
  roleSelectLabel: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  roleSelectSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  // Password
  pwRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    fontSize: 14, color: colors.textPrimary, backgroundColor: "#FAFAFA",
  },
  eyeBtn: { padding: 8 },
  hint: { fontSize: 12, color: colors.textSecondary, marginBottom: 20 },

  // View detail
  viewHeader: { flexDirection: "row", gap: 14, alignItems: "flex-start", marginBottom: 16 },
  viewAvatar: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  viewAvatarText: { fontSize: 24, fontWeight: "700" },
  viewName: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  viewSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  detailGrid: { marginBottom: 8 },
});
