import { useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl,
  Animated, PanResponder, Dimensions, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getUser } from "../../lib/auth";
import { apiFetch } from "../../lib/api";
import { colors, spacing, radius } from "../../lib/theme";

const SWIPE_THRESHOLD = 60;
const ACTION_WIDTH = 180; // total revealed width for 3 actions

interface PriceGroup { id: number; label: string; price: number; }
interface Item { id: number; name: string; category: string; sku?: string; commission: number; priceGroups: PriceGroup[]; iconUrl?: string | null; }

const ITEM_ICONS: Record<string, string> = {
  Shirts: "shirt-outline", Tshirts: "shirt-outline", Shirt: "shirt-outline",
  Pants: "body-outline", Belts: "ellipsis-horizontal-circle-outline",
  Accessories: "watch-outline", Underwear: "body-outline", Vest: "body-outline",
  default: "shirt-outline",
};

const ICON_COLORS: Record<string, string> = {
  Shirts: "#E6A817", Tshirts: "#E6A817", Shirt: "#E6A817",
  Pants: "#3B7DD8", Belts: "#7B5EA7", Accessories: "#E67E22",
  Underwear: "#2C7BE5", Vest: "#2C3E50", default: "#00897B",
};

export default function ItemsScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = async () => {
    const u = await getUser();
    setUser(u);
    if (!u) return;
    const data = await apiFetch(`items?shopId=${u.shopId}`);
    if (!data.error) setItems(data.items);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const deleteItem = (item: Item) => {
    Alert.alert("Delete Item", `Delete "${item.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await apiFetch(`items/${item.id}`, { method: "DELETE" });
          setItems((prev) => prev.filter((i) => i.id !== item.id));
          setOpenId(null);
        },
      },
    ]);
  };

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {/* Page title */}
      <Text style={styles.pageTitle}>List of available items</Text>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search an item"
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
        keyExtractor={(i) => i.id.toString()}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <SwipeableRow
            item={item}
            isOpen={openId === item.id}
            onOpen={() => setOpenId(item.id)}
            onClose={() => setOpenId(null)}
            onEdit={() => { setOpenId(null); router.push({ pathname: "/items/edit", params: { id: item.id } }); }}
            onDelete={() => deleteItem(item)}
            onBarcode={() => { setOpenId(null); Alert.alert("Barcode", `Generate barcode for "${item.name}" — coming soon`); }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={48} color={colors.border} />
            <Text style={styles.emptyText}>No items found</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/items/add")}>
              <Text style={styles.emptyBtnText}>Add First Item</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push("/items/add")}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ── Swipeable row ──────────────────────────────────────────────
function SwipeableRow({
  item, isOpen, onOpen, onClose, onEdit, onDelete, onBarcode,
}: {
  item: Item;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onBarcode: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;

  const snapTo = (toValue: number) => {
    Animated.spring(translateX, { toValue, useNativeDriver: true, bounciness: 4 }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        translateX.setOffset((translateX as any)._value);
        translateX.setValue(0);
      },
      onPanResponderMove: (_, g) => {
        const val = g.dx;
        if (val < 0) translateX.setValue(Math.max(val, -ACTION_WIDTH));
        else translateX.setValue(Math.min(val, 0));
      },
      onPanResponderRelease: (_, g) => {
        translateX.flattenOffset();
        const cur = (translateX as any)._value;
        if (g.dx < -SWIPE_THRESHOLD || cur < -ACTION_WIDTH / 2) {
          snapTo(-ACTION_WIDTH);
          onOpen();
        } else {
          snapTo(0);
          onClose();
        }
      },
    })
  ).current;

  // Sync with external open/close
  const prevOpen = useRef(isOpen);
  if (prevOpen.current !== isOpen) {
    prevOpen.current = isOpen;
    if (!isOpen) snapTo(0);
  }

  const iconName = (ITEM_ICONS[item.category] ?? ITEM_ICONS.default) as any;
  const iconColor = ICON_COLORS[item.category] ?? ICON_COLORS.default;
  const priceStr = item.priceGroups.map((p) => p.price.toLocaleString()).join(" | ");

  return (
    <View style={styles.rowWrap}>
      {/* Background actions */}
      <View style={styles.actionsBg}>
        {/* Barcode */}
        <TouchableOpacity style={[styles.swipeBtn, { backgroundColor: "#00BCD4", width: 60 }]} onPress={onBarcode}>
          <Ionicons name="barcode-outline" size={22} color="#fff" />
          <Text style={styles.swipeBtnLabel}>Barcode</Text>
        </TouchableOpacity>
        {/* Edit */}
        <TouchableOpacity style={[styles.swipeBtn, { backgroundColor: "#FF9800", width: 60 }]} onPress={onEdit}>
          <Ionicons name="create-outline" size={22} color="#fff" />
          <Text style={styles.swipeBtnLabel}>Edit</Text>
        </TouchableOpacity>
        {/* Delete */}
        <TouchableOpacity style={[styles.swipeBtn, { backgroundColor: "#e53935", width: 60 }]} onPress={onDelete}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <Text style={styles.swipeBtnLabel}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Foreground row */}
      <Animated.View
        style={[styles.itemRow, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <View style={[styles.itemIconBox, { backgroundColor: iconColor + "22" }]}>
          {item.iconUrl ? (
            <Image source={{ uri: item.iconUrl }} style={{ width: 36, height: 36, borderRadius: 6 }} />
          ) : (
            <Ionicons name={iconName} size={26} color={iconColor} />
          )}
          {item.sku ? <Text style={styles.itemSku}>{item.sku}</Text> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemCategory} numberOfLines={1}>{item.category}</Text>
          <Text style={styles.itemPrices} numberOfLines={1}>{priceStr}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  pageTitle: {
    fontSize: 17, fontWeight: "700", color: "#222",
    textAlign: "center", paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#eee",
  },

  searchBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f5f5f5", margin: 12, marginBottom: 8,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: "#e0e0e0", gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#333" },

  // Swipeable
  rowWrap: { overflow: "hidden", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  actionsBg: {
    position: "absolute", right: 0, top: 0, bottom: 0,
    flexDirection: "row", width: ACTION_WIDTH,
  },
  swipeBtn: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 3,
  },
  swipeBtnLabel: { fontSize: 10, color: "#fff", fontWeight: "600" },

  itemRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 12, gap: 12,
  },
  itemIconBox: {
    width: 52, alignItems: "center", justifyContent: "center", gap: 2,
  },
  itemSku: { fontSize: 9, color: "#aaa", fontWeight: "600", letterSpacing: 0.5 },
  itemName: { fontSize: 15, fontWeight: "700", color: "#222", marginBottom: 1 },
  itemCategory: { fontSize: 11, color: "#888", marginBottom: 2 },
  itemPrices: { fontSize: 13, color: "#555" },

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
