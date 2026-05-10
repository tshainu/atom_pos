import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../lib/theme";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          headerTitle: "Dashboard",
          headerRight: () => <DrawerButton />,
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: "POS",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
          headerTitle: "Point of Sale",
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
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

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
  },
});
