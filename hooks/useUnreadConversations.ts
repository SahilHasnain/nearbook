import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { client, collections, config, isDemo } from "@/lib/appwrite";
import {
  getUnreadChats,
  refreshUnreadChats,
  subscribeUnreadChats,
} from "@/lib/chat-center";
import { useAuth } from "@/context/auth";

export function useUnreadConversations(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(getUnreadChats);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeUnreadChats(() => setCount(getUnreadChats()));
    return unsubscribe;
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user) refreshUnreadChats(user.$id);
    }, [user])
  );

  useEffect(() => {
    if (!user || isDemo) return;
    const channel = `databases.${config.databaseId}.collections.${collections.messages}.documents`;
    const unsubscribe = client.subscribe(channel, (response) => {
      const payload = response.payload as { senderId?: string };
      if (!payload.senderId || payload.senderId === user.$id) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => refreshUnreadChats(user.$id), 500);
    });
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      unsubscribe();
    };
  }, [user]);

  return count;
}
