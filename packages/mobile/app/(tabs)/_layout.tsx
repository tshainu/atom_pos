import { Tabs } from "expo-router";
import { View, Image, Text, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { colors } from "../../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { getUser } from "../../lib/auth";

const homeIcon = require("../../assets/icons/home-v2.png");
const posIcon = require("../../assets/icons/pos-v2.png");
const reportIcon = require("../../assets/icons/report-v2.png");

function TabIcon({ source, focused, size }: { source: any; focused: boolean; size: number }) {
  return (
    <Image
      source={source}
      style={{
        width: size,
        height: size,
        resizeMode: "contain",
        opacity: focused ? 1 : 0.45,
      }}
    />
  );
}

function DashboardTitle() {
  const [shopName, setShopName] = useState<string | null>(null);
  useEffect(() => { getUser().then((u) => setShopName(u?.shopName ?? null)); }, []);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 17 }}>Dashboard</Text>
      {shopName ? (
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: "500" }}>
          of {shopName}
        </Text>
      ) : null}
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" as const },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" as const },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, size }) => (
            <TabIcon source={homeIcon} focused={focused} size={size} />
          ),
          headerTitle: () => <DashboardTitle />,
          headerRight: () => <DrawerButton />,
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: "POS",
          tabBarIcon: ({ focused, size }) => (
            <TabIcon source={posIcon} focused={focused} size={size} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ focused, size }) => (
            <TabIcon source={reportIcon} focused={focused} size={size} />
          ),
          headerTitle: "Reports",
        }}
      />
    </Tabs>
  );
}

function DrawerButton() {
  const { router } = require("expo-router");
  return (
    <View style={{ marginRight: 16 }}>
      <Ionicons
        name="menu-outline"
        size={28}
        color="#fff"
        onPress={() => router.push("/drawer")}
      />
    </View>
  );
}
