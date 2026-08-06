import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { client, collections, config, isDemo } from "@/lib/appwrite";
import { getConversation, listMessages, markConversationRead, sendMessage } from "@/lib/api";
import { useAuth } from "@/context/auth";
import { ErrorState } from "@/components/ui/Spinner";
import KeyboardSpacer from "@/components/KeyboardSpacer";
import { refreshUnreadChats } from "@/lib/chat-center";
import type { Conversation, Message } from "@/lib/types";

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;

    (async () => {
      try {
        const conv = await getConversation(id);
        if (!active) return;
        setConversation(conv);
        setMessages(await listMessages(id));
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load chat");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!conversation || !user) return;
    markConversationRead(conversation, user.$id);
    refreshUnreadChats(user.$id);
  }, [conversation, user]);

  useEffect(() => {
    if (!id || isDemo) return;
    const channel = `databases.${config.databaseId}.collections.${collections.messages}.documents`;
    const unsubscribe = client.subscribe(channel, (response) => {
      const payload = response.payload as Message;
      if (payload.conversationId !== id) return;
      setMessages((prev) => {
        if (prev.some((m) => m.$id === payload.$id)) return prev;
        return [...prev, payload];
      });
      if (payload.senderId !== user?.$id && conversation) {
        if (user) markConversationRead(conversation, user.$id);
        refreshUnreadChats(user?.$id ?? "");
      }
    });
    return () => unsubscribe();
  }, [id, user, conversation]);

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  async function onSend() {
    const body = text.trim();
    if (!body || !user || !conversation) return;
    setSending(true);
    try {
      const recipientId =
        conversation.buyerId === user.$id
          ? conversation.sellerId
          : conversation.buyerId;
      const message = await sendMessage({
        conversationId: id!,
        senderId: user.$id,
        recipientId,
        text: body,
      });
      setMessages((prev) => {
        if (prev.some((item) => item.$id === message.$id)) return prev;
        return [...prev, message];
      });
      setText("");
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  const otherName =
    conversation && user
      ? conversation.buyerId === user.$id
        ? conversation.sellerName
        : conversation.buyerName
      : "";

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (error || !conversation) {
    return <ErrorState message={error ?? "Conversation not found."} />;
  }

  return (
    <View className="flex-1 bg-white">
      <View
        className="border-b border-slate-100 px-4 pb-3"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Text className="text-lg font-bold text-slate-900">{otherName}</Text>
        <Text className="text-sm text-slate-500" numberOfLines={1}>
          {conversation.listingTitle}
        </Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.$id}
        contentContainerClassName="gap-2 p-4"
        renderItem={({ item }) => {
          const mine = item.senderId === user?.$id;
          return (
            <View
              className={[
                "max-w-[80%] rounded-2xl px-4 py-2.5",
                mine ? "self-end bg-indigo-600" : "self-start bg-slate-100",
              ].join(" ")}
            >
              <Text className={mine ? "text-white" : "text-slate-800"}>
                {item.text}
              </Text>
              <Text
                className={[
                  "mt-1 text-[10px]",
                  mine ? "text-indigo-200" : "text-slate-400",
                ].join(" ")}
              >
                {formatTime(item.$createdAt)}
              </Text>
            </View>
          );
        }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      <View
        className="flex-row items-center gap-2 border-t border-slate-100 px-4 py-3"
        style={{ paddingBottom: 12 + insets.bottom }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message…"
          placeholderTextColor="#94a3b8"
          multiline
          className="max-h-24 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900"
        />
        <Pressable
          onPress={onSend}
          disabled={!text.trim() || sending}
          className="h-11 w-11 items-center justify-center rounded-full bg-indigo-600 active:bg-indigo-700 disabled:opacity-50"
        >
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
      <KeyboardSpacer />
    </View>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
