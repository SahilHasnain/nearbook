import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { listConversations } from "@/lib/api";
import { useAuth } from "@/context/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/Spinner";
import type { Conversation } from "@/lib/types";

export default function ChatScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setConversations(await listConversations(user.$id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load chats");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <RequireAuth>
      {loading ? (
        <Spinner label="Loading chats…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <View className="flex-1 bg-white">
          <Text className="px-5 pb-3 pt-16 text-2xl font-bold text-slate-900">
            Chats
          </Text>
          {conversations.length === 0 ? (
            <EmptyState icon="💬" message="No conversations yet. Message a seller from any book." />
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.$id}
              contentContainerClassName="gap-1 px-3 pb-8"
              renderItem={({ item }) => {
                const otherName =
                  item.buyerId === user?.$id ? item.sellerName : item.buyerName;
                return (
                  <Pressable
                    onPress={() => router.push(`/chat/${item.$id}`)}
                    className="flex-row items-center gap-3 rounded-xl px-2 py-3 active:bg-slate-50"
                  >
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                      <Text className="text-lg font-bold text-indigo-700">
                        {otherName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1 gap-0.5">
                      <View className="flex-row items-center justify-between">
                        <Text className="font-semibold text-slate-900" numberOfLines={1}>
                          {otherName}
                        </Text>
                        {item.lastMessageAt ? (
                          <Text className="text-xs text-slate-400">
                            {formatTime(item.lastMessageAt)}
                          </Text>
                        ) : null}
                      </View>
                      <Text className="text-sm text-slate-500" numberOfLines={1}>
                        {item.lastMessage ?? `About: ${item.listingTitle}`}
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
