import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" backgroundColor="#00B5A5" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: "#00B5A5" },
              headerTintColor: "#fff",
              headerTitleStyle: { fontWeight: "bold" },
              contentStyle: { backgroundColor: "#F5F7FA" },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="items/index" options={{ title: "Items Management" }} />
            <Stack.Screen name="items/add" options={{ title: "Add Item" }} />
            <Stack.Screen name="items/edit" options={{ title: "Edit Item" }} />
            <Stack.Screen name="staff/index" options={{ title: "Staff Management" }} />
            <Stack.Screen name="staff/add" options={{ title: "Add Staff" }} />
            <Stack.Screen name="staff/edit" options={{ title: "Edit Staff" }} />
            <Stack.Screen name="staff/view" options={{ title: "Staff Details" }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
