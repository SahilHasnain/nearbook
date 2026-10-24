import { router, Stack } from "expo-router";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import "@/global.css";
import { AuthProvider, useAuth } from "@/context/auth";
import { AuthGateProvider } from "@/context/auth-gate";
import { Spinner } from "@/components/ui/Spinner";

function RootNavigator() {
  const { user, loading } = useAuth();

  useEffect(() => {
    function openNotification(notification: Notifications.Notification) {
      const data = notification.request.content.data ?? {};
      if (typeof data.conversationId === "string") {
        router.push(`/chat/${data.conversationId}`);
      } else if (typeof data.listingId === "string") {
        router.push(`/listing/${data.listingId}`);
      } else {
        router.push("/(tabs)/notifications");
      }
    }

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) {
      openNotification(lastResponse.notification);
      Notifications.clearLastNotificationResponse();
    }
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotification(response.notification);
    });
    return () => subscription.remove();
  }, []);

  if (loading) {
    return <Spinner label="Loading…" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="listing/[id]" />
      <Stack.Screen name="saved" options={{ headerShown: true, title: "Saved books" }} />
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
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
