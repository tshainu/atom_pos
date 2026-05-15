import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  ScrollView, Modal, Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import { getUser } from "../lib/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DISMISSED_KEY = "dismissed_announcements";

interface Announcement {
  id: number;
  title: string;
  body: string;
  priority: string;
  created_at: number;
}

const PRIORITY_STYLE: Record<string, { bg: string; border: string; icon: string; label: string; textColor: string }> = {
  urgent: {
    bg: "#2d1010", border: "#ef4444", icon: "alert-circle",
    label: "URGENT", textColor: "#ef4444",
  },
  important: {
    bg: "#2d2010", border: "#f59e0b", icon: "warning",
    label: "IMPORTANT", textColor: "#f59e0b",
  },
  normal: {
    bg: "#0f1f2d", border: "#2BBFB3", icon: "megaphone",
    label: "NOTICE", textColor: "#2BBFB3",
  },
};

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [current, setCurrent] = useState(0);
  const [modalAnn, setModalAnn] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadDismissed().then(fetchAnnouncements);
  }, []);

  async function loadDismissed() {
    try {
      const raw = await AsyncStorage.getItem(DISMISSED_KEY);
      if (raw) setDismissed(JSON.parse(raw));
    } catch (_) {}
  }

  async function fetchAnnouncements() {
    try {
      const user = await getUser();
      if (!user?.shopId) return;
      const data = await apiFetch(`/announcements?shopId=${user.shopId}`);
      if (data?.announcements) {
        setAnnouncements(data.announcements);
      }
    } catch (_) {} finally {
      setLoaded(true);
    }
  }

  async function dismiss(id: number) {
    const next = [...dismissed, id];
    setDismissed(next);
    await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    // move current pointer if needed
    setCurrent(c => Math.max(0, c));
  }

  const visible = announcements.filter(a => !dismissed.includes(a.id));
  if (!loaded || visible.length === 0) return null;

  const ann = visible[Math.min(current, visible.length - 1)];
  const ps = PRIORITY_STYLE[ann.priority] ?? PRIORITY_STYLE.normal;

  return (
    <>
      <View style={[styles.banner, { backgroundColor: ps.bg, borderColor: ps.border }]}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={styles.leftRow}>
            <Ionicons name={ps.icon as any} size={16} color={ps.textColor} />
            <Text style={[styles.priorityLabel, { color: ps.textColor }]}>{ps.label}</Text>
            {visible.length > 1 && (
              <Text style={styles.counter}>{current + 1}/{visible.length}</Text>
            )}
          </View>
          <TouchableOpacity onPress={() => dismiss(ann.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="close" size={18} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={1}>{ann.title}</Text>

        {/* Body preview */}
        <Text style={styles.body} numberOfLines={2}>{ann.body}</Text>

        {/* Footer actions */}
        <View style={styles.footerRow}>
          {ann.body.length > 80 && (
            <TouchableOpacity onPress={() => setModalAnn(ann)}>
              <Text style={[styles.readMore, { color: ps.textColor }]}>Read more →</Text>
            </TouchableOpacity>
          )}
          {visible.length > 1 && (
            <View style={styles.navButtons}>
              <TouchableOpacity
                disabled={current === 0}
                onPress={() => setCurrent(c => Math.max(0, c - 1))}
                style={[styles.navBtn, current === 0 && { opacity: 0.3 }]}
              >
                <Ionicons name="chevron-back" size={14} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
              <TouchableOpacity
                disabled={current >= visible.length - 1}
                onPress={() => setCurrent(c => Math.min(visible.length - 1, c + 1))}
                style={[styles.navBtn, current >= visible.length - 1 && { opacity: 0.3 }]}
              >
                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Full-screen modal */}
      {modalAnn && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setModalAnn(null)}>
          <Pressable style={styles.overlay} onPress={() => setModalAnn(null)}>
            <Pressable style={styles.modal} onPress={e => e.stopPropagation()}>
              {(() => {
                const mps = PRIORITY_STYLE[modalAnn.priority] ?? PRIORITY_STYLE.normal;
                return (
                  <>
                    <View style={[styles.modalPriorityBar, { backgroundColor: mps.border }]} />
                    <View style={styles.modalContent}>
                      <View style={styles.headerRow}>
                        <View style={styles.leftRow}>
                          <Ionicons name={mps.icon as any} size={16} color={mps.textColor} />
                          <Text style={[styles.priorityLabel, { color: mps.textColor }]}>{mps.label}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setModalAnn(null)}>
                          <Ionicons name="close-circle" size={24} color="rgba(255,255,255,0.4)" />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.modalTitle}>{modalAnn.title}</Text>
                      <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                        <Text style={styles.modalBody}>{modalAnn.body}</Text>
                      </ScrollView>
                      <TouchableOpacity
                        style={[styles.dismissBtn, { borderColor: mps.border }]}
                        onPress={() => { setModalAnn(null); dismiss(modalAnn.id); }}
                      >
                        <Text style={[styles.dismissBtnText, { color: mps.textColor }]}>Dismiss</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                );
              })()}
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  priorityLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  counter: {
    fontSize: 10,
    color: "rgba(255,255,255,0.3)",
    marginLeft: 4,
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  body: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  readMore: {
    fontSize: 12,
    fontWeight: "600",
  },
  navButtons: {
    flexDirection: "row",
    gap: 8,
    marginLeft: "auto",
  },
  navBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 6,
    padding: 4,
  },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modal: {
    backgroundColor: "#13131f",
    borderRadius: 16,
    width: "100%",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalPriorityBar: {
    height: 4,
    width: "100%",
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 8,
  },
  modalBody: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    lineHeight: 22,
  },
  dismissBtn: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  dismissBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
