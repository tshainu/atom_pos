import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getUser } from "../../lib/auth";
import { apiFetch } from "../../lib/api";
import { colors } from "../../lib/theme";

interface PriceTier { id: number; price: string; }
interface Category { id: number; name: string; }

let _id = 100;
const newTier = (price = ""): PriceTier => ({ id: _id++, price });

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [name, setName] = useState("");
  const [commission, setCommission] = useState("");
  const [iconUri, setIconUri] = useState<string | null>(null);
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([newTier()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sku, setSku] = useState<string | null>(null);

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [loadingCats, setLoadingCats] = useState(true);

  // New category
  const [newCatName, setNewCatName] = useState("");
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [savingCat, setSavingCat] = useState(false);

  // Edit category
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState("");

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadItem(), loadCategories()]);
    };
    init();
  }, [id]);

  const loadItem = async () => {
    const data = await apiFetch(`items`);
    const item = data.items?.find((i: any) => i.id.toString() === id);
    if (item) {
      setName(item.name);
      setCommission(item.commission?.toString() ?? "");
      setSku(item.sku ?? null);
      setIconUri(item.iconUrl ?? null);
      if (item.priceGroups?.length > 0) {
        setPriceTiers(item.priceGroups.map((pg: any) => newTier(pg.price.toString())));
      }
      if (item.category) setSelectedCategory(item.category);
    }
    setLoading(false);
  };

  const loadCategories = async () => {
    try {
      const u = await getUser();
      const data = await apiFetch(`categories?shopId=${u?.shopId}`);
      if (data.categories) setCategories(data.categories);
    } catch {}
    setLoadingCats(false);
  };

  const addCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    setSavingCat(true);
    try {
      const u = await getUser();
      const data = await apiFetch("categories", {
        method: "POST",
        body: JSON.stringify({ shopId: u?.shopId, name: trimmed }),
      });
      if (data.category) {
        setCategories((p) => [...p, data.category]);
        setSelectedCategory(data.category.name);
        setNewCatName("");
        setShowNewCatInput(false);
      }
    } catch {}
    setSavingCat(false);
  };

  const saveEditCategory = async () => {
    if (!editingCat || !editCatName.trim()) return;
    setSavingCat(true);
    try {
      const data = await apiFetch(`categories/${editingCat.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editCatName.trim() }),
      });
      if (data.category) {
        setCategories((p) => p.map((c) => c.id === editingCat.id ? data.category : c));
        if (selectedCategory === editingCat.name) setSelectedCategory(data.category.name);
      }
    } catch {}
    setEditingCat(null);
    setSavingCat(false);
  };

  const deleteCategory = async (cat: Category) => {
    Alert.alert("Delete category", `Delete "${cat.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          await apiFetch(`categories/${cat.id}`, { method: "DELETE" });
          setCategories((p) => p.filter((c) => c.id !== cat.id));
          if (selectedCategory === cat.name) {
            const remaining = categories.filter((c) => c.id !== cat.id);
            setSelectedCategory(remaining[0]?.name ?? "");
          }
        },
      },
    ]);
  };

  const onLongPressCategory = (cat: Category) => {
    Alert.alert(cat.name, "What do you want to do?", [
      {
        text: "Edit", onPress: () => {
          setEditingCat(cat);
          setEditCatName(cat.name);
        },
      },
      { text: "Delete", style: "destructive", onPress: () => deleteCategory(cat) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const addTier = () => setPriceTiers((p) => [...p, newTier()]);
  const updateTier = (tid: number, val: string) =>
    setPriceTiers((p) => p.map((t) => t.id === tid ? { ...t, price: val } : t));
  const removeTier = (tid: number) => {
    if (priceTiers.length === 1) return;
    setPriceTiers((p) => p.filter((t) => t.id !== tid));
  };

  const pickImage = () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 500 * 1024) { Alert.alert("Too large", "Max 500kb"); return; }
        const reader = new FileReader();
        reader.onload = (ev) => setIconUri(ev.target?.result as string);
        reader.readAsDataURL(file);
      };
      input.click();
    }
  };

  const save = async () => {
    if (!name.trim()) { Alert.alert("Error", "Name is required"); return; }
    const validPrices = priceTiers.filter((t) => t.price && parseFloat(t.price) > 0);
    if (validPrices.length === 0) { Alert.alert("Error", "Add at least one price"); return; }

    setSaving(true);
    try {
      const data = await apiFetch(`items/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: name.trim(),
          category: selectedCategory || "General",
          commission: parseFloat(commission) || 0,
          iconUrl: iconUri,
          priceGroups: validPrices.map((t, i) => ({
            label: `Price ${i + 1}`,
            price: parseFloat(t.price),
          })),
        }),
      });
      if (data.error) { Alert.alert("Error", data.error); return; }
      setSuccess(true);
      setTimeout(() => router.back(), 1500);
    } catch {
      Alert.alert("Error", "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Success banner */}
          {success && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.successText}>Item updated!</Text>
            </View>
          )}

          {/* Title */}
          <Text style={styles.pageTitle}>Edit item</Text>

          {/* Item Name */}
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="Item Name"
            placeholderTextColor="#aaa"
          />

          {/* Upload icon + SKU */}
          <TouchableOpacity style={styles.uploadRow} onPress={pickImage} activeOpacity={0.75}>
            <View style={styles.iconWrap}>
              {iconUri ? (
                <Image source={{ uri: iconUri }} style={styles.iconPreview} />
              ) : (
                <View style={styles.iconPlaceholder}>
                  <Ionicons name="image-outline" size={30} color="#4CAF50" />
                </View>
              )}
              {sku && <Text style={styles.skuBadge}>SKU: {sku}</Text>}
            </View>
            <View>
              <Text style={styles.uploadLabel}>Upload product icon</Text>
              <Text style={styles.uploadHint}>(120×120 px : Max.500kb)</Text>
            </View>
          </TouchableOpacity>

          {/* Categories */}
          <Text style={styles.sectionLabel}>Category</Text>
          {loadingCats ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ alignSelf: "flex-start" }} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.catScroll}
              contentContainerStyle={styles.catRow}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catChip, selectedCategory === cat.name && styles.catChipActive]}
                  onPress={() => setSelectedCategory(cat.name)}
                  onLongPress={() => onLongPressCategory(cat)}
                  delayLongPress={400}
                >
                  <Text style={[styles.catChipText, selectedCategory === cat.name && styles.catChipTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.catAddBtn}
                onPress={() => setShowNewCatInput((v) => !v)}
              >
                <Ionicons name="add" size={18} color="#4CAF50" />
              </TouchableOpacity>
            </ScrollView>
          )}

          {showNewCatInput && (
            <View style={styles.newCatRow}>
              <TextInput
                style={styles.newCatInput}
                value={newCatName}
                onChangeText={setNewCatName}
                placeholder="Category name"
                placeholderTextColor="#aaa"
                autoFocus
                onSubmitEditing={addCategory}
              />
              <TouchableOpacity style={styles.newCatSave} onPress={addCategory} disabled={savingCat}>
                {savingCat
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.newCatSaveText}>Add</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowNewCatInput(false); setNewCatName(""); }}>
                <Ionicons name="close" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          )}

          {editingCat && (
            <View style={styles.newCatRow}>
              <TextInput
                style={styles.newCatInput}
                value={editCatName}
                onChangeText={setEditCatName}
                placeholder="Category name"
                placeholderTextColor="#aaa"
                autoFocus
                onSubmitEditing={saveEditCategory}
              />
              <TouchableOpacity style={styles.newCatSave} onPress={saveEditCategory} disabled={savingCat}>
                {savingCat
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.newCatSaveText}>Save</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingCat(null)}>
                <Ionicons name="close" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          )}

          {/* Price group — horizontal scroll */}
          <Text style={styles.sectionLabel}>Enter the price group</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.priceScroll}
            contentContainerStyle={styles.priceRow}
            keyboardShouldPersistTaps="handled"
          >
            {priceTiers.map((tier) => (
              <View key={tier.id} style={styles.priceChip}>
                <TextInput
                  style={styles.priceChipInput}
                  value={tier.price}
                  onChangeText={(v) => updateTier(tier.id, v)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#999"
                />
                {priceTiers.length > 1 && (
                  <TouchableOpacity onPress={() => removeTier(tier.id)} style={styles.chipRemove}>
                    <Ionicons name="close" size={13} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.priceAddChip} onPress={addTier}>
              <Ionicons name="add" size={18} color="#4CAF50" />
            </TouchableOpacity>
          </ScrollView>

          {/* Commission */}
          <View style={styles.commissionRow}>
            <Text style={styles.commissionLabel}>Enter the commission{"\n"}for this product sale</Text>
            <View style={styles.commissionInputWrap}>
              <TextInput
                style={styles.commissionInput}
                value={commission}
                onChangeText={setCommission}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#aaa"
              />
              <Text style={styles.commissionPct}>%</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={save}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>Save</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 20, gap: 16 },

  successBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#4CAF50", borderRadius: 10,
    padding: 14, marginBottom: 4,
  },
  successText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  pageTitle: {
    fontSize: 18, fontWeight: "700", color: "#222",
    textAlign: "center", marginBottom: 4,
  },

  nameInput: {
    borderWidth: 1, borderColor: "#ccc", borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: "#222", backgroundColor: "#fff",
  },

  uploadRow: {
    flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 6,
  },
  iconWrap: { alignItems: "center", gap: 4 },
  iconPlaceholder: {
    width: 60, height: 60, borderRadius: 10,
    backgroundColor: "#f0f9f0", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#c8e6c9",
  },
  iconPreview: { width: 60, height: 60, borderRadius: 10 },
  skuBadge: {
    fontSize: 10, color: "#4CAF50", fontWeight: "700",
    backgroundColor: "#f0fff0", borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: "#c8e6c9",
  },
  uploadLabel: { fontSize: 14, fontWeight: "600", color: "#333" },
  uploadHint: { fontSize: 11, color: "#888", marginTop: 2 },

  sectionLabel: { fontSize: 14, fontWeight: "600", color: "#333" },

  catScroll: { flexGrow: 0 },
  catRow: { flexDirection: "row", gap: 8, alignItems: "center", paddingVertical: 4 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: "#ccc",
    backgroundColor: "#fff",
  },
  catChipActive: { borderColor: "#4CAF50", backgroundColor: "#f0fff0" },
  catChipText: { fontSize: 13, fontWeight: "500", color: "#555" },
  catChipTextActive: { color: "#2e7d32", fontWeight: "700" },
  catAddBtn: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1.5, borderColor: "#4CAF50",
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#fff",
  },

  newCatRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#f9f9f9", borderRadius: 8, padding: 8,
    borderWidth: 1, borderColor: "#e0e0e0",
  },
  newCatInput: {
    flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 7, fontSize: 14, color: "#222",
    backgroundColor: "#fff",
  },
  newCatSave: {
    backgroundColor: "#4CAF50", borderRadius: 6,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  newCatSaveText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  priceScroll: { flexGrow: 0 },
  priceRow: { flexDirection: "row", gap: 8, alignItems: "center", paddingVertical: 4 },
  priceChip: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: "#ccc", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: "#fff",
  },
  priceChipInput: {
    fontSize: 14, fontWeight: "600", color: "#222",
    width: 60, textAlign: "center", padding: 0,
  },
  chipRemove: { marginLeft: 4 },
  priceAddChip: {
    width: 36, height: 36, borderRadius: 8,
    borderWidth: 1.5, borderColor: "#4CAF50",
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#fff",
  },

  commissionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: "#f0f0f0",
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
    paddingVertical: 14,
  },
  commissionLabel: { fontSize: 13, color: "#555", lineHeight: 20 },
  commissionInputWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  commissionInput: {
    borderWidth: 1.5, borderColor: "#ccc", borderRadius: 6,
    width: 64, paddingHorizontal: 8, paddingVertical: 8,
    fontSize: 14, color: "#222", textAlign: "center",
  },
  commissionPct: { fontSize: 15, color: "#333", fontWeight: "600" },

  btnRow: { flexDirection: "row", gap: 16, marginTop: 8, justifyContent: "center" },
  saveBtn: {
    paddingVertical: 12, paddingHorizontal: 40,
    backgroundColor: "#4CAF50", borderRadius: 8, alignItems: "center",
  },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  cancelBtn: {
    paddingVertical: 12, paddingHorizontal: 36,
    backgroundColor: "#e53935", borderRadius: 8, alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
