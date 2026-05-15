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
import { apiFetch, cachedFetchAsync } from "../../lib/api";
import { colors, spacing, radius } from "../../lib/theme";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

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
    if (!u) { setLoading(false); return; }
    const cached = await cachedFetchAsync(`items?shopId=${u.shopId}`);
    if (cached && !cached.error) { setItems(cached.items ?? []); setLoading(false); }
    apiFetch(`items?shopId=${u.shopId}`).then((data) => {
      if (!data.error) setItems(data.items ?? []);
      setLoading(false);
    });
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

  const generateBarcodeLabel = async (item: Item) => {
    const shopName = user?.shopName ?? "Shop";
    const barcodeValue = item.sku && item.sku.trim() ? item.sku.trim() : item.id.toString();
    const firstPrice = item.priceGroups?.[0]?.price ?? 0;
    const priceFormatted = `Rs. ${firstPrice.toLocaleString()}`;

    // --- Inline CODE128B barcode generator (no CDN needed) ---
    const CODE128B_CHARS: Record<string, number> = {};
    " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~".split("").forEach((c, i) => { CODE128B_CHARS[c] = i + 32; });
    const CODE128_PATTERNS: Record<number, string> = {
      0:"11011001100",1:"11001101100",2:"11001100110",3:"10010011000",4:"10010001100",
      5:"10001001100",6:"10011001000",7:"10011000100",8:"10001100100",9:"11001001000",
      10:"11001000100",11:"11000100100",12:"10110011100",13:"10011011100",14:"10011001110",
      15:"10111001100",16:"10011101100",17:"10011100110",18:"11001110010",19:"11001011100",
      20:"11001001110",21:"11011100100",22:"11001110100",23:"11101101110",24:"11101001100",
      25:"11100101100",26:"11100100110",27:"11101100100",28:"11100110100",29:"11100110010",
      30:"11011011000",31:"11011000110",32:"11000110110",33:"10100011000",34:"10001011000",
      35:"10001000110",36:"10110001000",37:"10001101000",38:"10001100010",39:"11010001000",
      40:"11000101000",41:"11000100010",42:"10110111000",43:"10110001110",44:"10001101110",
      45:"10111011000",46:"10111000110",47:"10001110110",48:"11101110110",49:"11010001110",
      50:"11000101110",51:"11011101000",52:"11011100010",53:"11011101110",54:"11101011000",
      55:"11101000110",56:"11100010110",57:"11101101000",58:"11101100010",59:"11100011010",
      60:"11101111010",61:"11001000010",62:"11110001010",63:"10100110000",64:"10100001100",
      65:"10010110000",66:"10010000110",67:"10000101100",68:"10000100110",69:"10110010000",
      70:"10110000100",71:"10011010000",72:"10011000010",73:"10000110100",74:"10000110010",
      75:"11000010010",76:"11001010000",77:"11110111010",78:"11000010100",79:"10001111010",
      80:"10100111100",81:"10010111100",82:"10010011110",83:"10111100100",84:"10011110100",
      85:"10011110010",86:"11110100100",87:"11110010100",88:"11110010010",89:"11011011110",
      90:"11011110110",91:"11110110110",92:"10101111000",93:"10100011110",94:"10001011110",
      95:"10111101000",96:"10111100010",97:"10011101110",98:"10011110110",99:"11110110010",
      100:"11010111000",101:"11010001100",102:"11010001110",103:"11010011100",104:"11000111010",
      105:"11010111010",106:"1100011101011",
    };
    const encodeCode128B = (text: string): string => {
      let checksum = 104; // START B value
      let encoded = CODE128_PATTERNS[104]; // START B
      for (let i = 0; i < text.length; i++) {
        const code = CODE128B_CHARS[text[i]];
        if (code === undefined) continue;
        checksum += (i + 1) * code;
        encoded += CODE128_PATTERNS[code] ?? "";
      }
      encoded += CODE128_PATTERNS[checksum % 103] ?? "";
      encoded += CODE128_PATTERNS[106]; // STOP
      return encoded;
    };
    const buildBarcodeSVG = (text: string): string => {
      const barW = 1.5;
      const barH = 36;
      const bits = encodeCode128B(text);
      const totalW = bits.length * barW;
      let rects = "";
      let x = 0;
      let i = 0;
      while (i < bits.length) {
        const bit = bits[i];
        let run = 1;
        while (i + run < bits.length && bits[i + run] === bit) run++;
        if (bit === "1") {
          rects += `<rect x="${x}" y="0" width="${run * barW}" height="${barH}" fill="#000"/>`;
        }
        x += run * barW;
        i += run;
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${barH}" viewBox="0 0 ${totalW} ${barH}">${rects}</svg>`;
    };
    const barcodeSVG = buildBarcodeSVG(barcodeValue);

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @page { size: 38mm 25mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 38mm; height: 25mm; overflow: hidden; }
  .label {
    width: 38mm;
    height: 25mm;
    padding: 1.2mm 1.5mm 1mm 1.5mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    font-family: Arial, Helvetica, sans-serif;
    background: #fff;
  }
  .shop-name {
    font-size: 7pt;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.5pt;
    text-align: center;
    color: #111;
    line-height: 1.1;
  }
  .item-name {
    font-size: 6pt;
    font-weight: 500;
    text-align: center;
    color: #333;
    line-height: 1.1;
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .price {
    font-size: 9pt;
    font-weight: 900;
    text-align: center;
    color: #000;
    line-height: 1;
  }
  .barcode-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
  }
  .barcode-wrap svg {
    max-width: 35mm;
    height: 9mm;
  }
  .sku-text {
    font-size: 6.5pt;
    font-weight: 700;
    color: #222;
    text-align: center;
    letter-spacing: 0.5pt;
  }
</style>
</head>
<body>
<div class="label">
  <div class="shop-name">${shopName}</div>
  <div class="item-name">${item.name}</div>
  <div class="price">${priceFormatted}</div>
  <div class="barcode-wrap">${barcodeSVG}</div>
  <div class="sku-text">${barcodeValue}</div>
</div>
</body>
</html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html, width: 143, height: 94 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: `Label: ${item.name}` });
      } else {
        Alert.alert("Saved", `Label saved to: ${uri}`);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to generate label");
    }
  };

  if (loading && items.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={{ padding: 16, gap: 10 }}>
          {[1,2,3,4,5].map((i) => <View key={i} style={{ height: 64, borderRadius: 12, backgroundColor: "#e8e8e8" }} />)}
        </View>
      </SafeAreaView>
    );
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
            onBarcode={() => { setOpenId(null); generateBarcodeLabel(item); }}
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
