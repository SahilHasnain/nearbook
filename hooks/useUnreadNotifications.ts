import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { client, collections, config, isDemo } from "@/lib/appwrite";
import {
  bumpUnread,
  getUnread,
  refreshUnread,
  subscribeUnread,
} from "@/lib/notification-center";
import { useAuth } from "@/context/auth";

export function useUnreadNotifications(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(getUnread);

  useEffect(() => {
    const unsubscribe = subscribeUnread(() => setCount(getUnread()));
    return unsubscribe;
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user) refreshUnread(user.$id);
    }, [user])
  );

  useEffect(() => {
    if (!user || isDemo) return;
    const channel = `databases.${config.databaseId}.collections.${collections.notifications}.documents`;
    const unsubscribe = client.subscribe(channel, (response) => {
      const payload = response.payload as { userId?: string };
      if (payload.userId === user.$id) bumpUnread(1);
    });
    return () => unsubscribe();
  }, [user]);

  return count;
}
