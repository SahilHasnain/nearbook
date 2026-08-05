import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "@/global.css";
import { AuthProvider, useAuth } from "@/context/auth";
import { AuthGateProvider } from "@/context/auth-gate";
import { Spinner } from "@/components/ui/Spinner";

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spinner label="Loading…" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="listing/[id]" />
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="chat/[id]" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGateProvider>
        <RootNavigator />
      </AuthGateProvider>
      <StatusBar style="auto" translucent backgroundColor="transparent" />
    </AuthProvider>
  );
}
