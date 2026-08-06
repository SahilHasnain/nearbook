import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api";
import { useAuth } from "@/context/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/Spinner";
import { refreshUnread, setUnread } from "@/lib/notification-center";
import type { AppNotification, NotificationType } from "@/lib/types";

const TYPE_ICON: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  message: "chatbubble",
  save: "bookmark",
  contact: "person",
  sold: "checkmark-circle",
};

export default function NotificationsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const items = await listNotifications(user.$id);
      setNotifications(items);
      const unread = items.filter((n) => !n.read).length;
      if (unread > 0) setUnread(unread);
      else refreshUnread(user.$id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load notifications");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onPress(item: AppNotification) {
    if (user && !item.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.$id === item.$id ? { ...n, read: true } : n))
      );
      markNotificationRead(item.$id).catch((e) =>
        console.warn("[notifications] mark read failed", e)
      );
      refreshUnread(user.$id);
    }
    if (item.conversationId) {
      router.push(`/chat/${item.conversationId}`);
    } else if (item.listingId) {
      router.push(`/listing/${item.listingId}`);
    }
  }

  async function onMarkAllRead() {
    if (!user) return;
    try {
      await markAllNotificationsRead(user.$id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {
      // best effort
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <RequireAuth>
      {loading ? (
        <Spinner label="Loading notifications…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 pb-3 pt-16">
            <Text className="text-2xl font-bold text-slate-900">
              Notifications
            </Text>
            {unreadCount > 0 ? (
              <Pressable onPress={onMarkAllRead} className="rounded-full px-3 py-1.5">
                <Text className="text-sm font-medium text-indigo-600">
                  Mark all read
                </Text>
              </Pressable>
            ) : null}
          </View>
          {notifications.length === 0 ? (
            <EmptyState
              icon="🔔"
              message="No notifications yet. You'll be notified about messages and activity on your books."
            />
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.$id}
              contentContainerClassName="gap-1 px-3 pb-8"
              renderItem={({ item }) => {
                const unread = !item.read;
                return (
                  <Pressable
                    onPress={() => onPress(item)}
                    className="flex-row items-center gap-3 rounded-xl px-2 py-3 active:bg-slate-50"
                  >
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                      <Ionicons name={TYPE_ICON[item.type]} size={20} color="#4338ca" />
                    </View>
                    <View className="flex-1 gap-0.5">
                      <View className="flex-row items-center justify-between">
                        <Text
                          className={[
                            "flex-1 text-sm font-semibold",
                            unread ? "text-slate-900" : "text-slate-700",
                          ].join(" ")}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        {unread ? (
                          <View className="ml-2 h-2.5 w-2.5 rounded-full bg-indigo-600" />
                        ) : null}
                      </View>
                      <Text className="text-sm text-slate-500" numberOfLines={2}>
                        {item.body}
                      </Text>
                      <Text className="text-xs text-slate-400">
                        {formatTime(item.$createdAt)}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      )}
    </RequireAuth>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "numeric", month: "short" });
}
