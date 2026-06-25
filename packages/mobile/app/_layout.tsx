import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";

const queryClient = new QueryClient();

// ── Global Error Boundary ─────────────────────────────────
interface EBState { error: Error | null; info: string }
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { error: null, info: "" };
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ error, info: info.componentStack ?? "" });
  }
  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;
    const msg = `ERROR: ${error.message}\n\nSTACK:\n${error.stack}\n\nCOMPONENT:\n${info}`;
    return (
      <View style={eb.container}>
        <Text style={eb.title}>⚠ App Crashed</Text>
        <Text style={eb.subtitle}>Copy this and send to developer:</Text>
        <ScrollView style={eb.scroll}>
          <Text style={eb.msg} selectable>{msg}</Text>
        </ScrollView>
        <TouchableOpacity style={eb.btn} onPress={() => Alert.alert("Error Details", msg)}>
          <Text style={eb.btnText}>Show Full Error</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[eb.btn, { backgroundColor: "#555", marginTop: 8 }]} onPress={() => this.setState({ error: null, info: "" })}>
          <Text style={eb.btnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const eb = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a1a", padding: 20, paddingTop: 60 },
  title: { color: "#ff4444", fontSize: 20, fontWeight: "bold", marginBottom: 8 },
  subtitle: { color: "#aaa", fontSize: 13, marginBottom: 12 },
  scroll: { flex: 1, backgroundColor: "#2a2a2a", borderRadius: 8, padding: 12, marginBottom: 16 },
  msg: { color: "#e0e0e0", fontSize: 11, fontFamily: "monospace" },
  btn: { backgroundColor: "#00B5A5", padding: 14, borderRadius: 8, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});
// ─────────────────────────────────────────────────────────

export default function RootLayout() {
  return (
    <ErrorBoundary>
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
              <Stack.Screen name="users/index" options={{ title: "User Management" }} />
              <Stack.Screen name="drawer" options={{ headerShown: false }} />
              <Stack.Screen name="settings/index" options={{ title: "Settings" }} />
              <Stack.Screen name="settings/printer" options={{ title: "Printer Settings" }} />
              <Stack.Screen name="settings/business" options={{ title: "Business Information" }} />
            </Stack>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
