import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ensureConversation,
  getListing,
  isSaved,
  photoUrl,
  toggleSaved,
} from "@/lib/api";
import { useAuth } from "@/context/auth";
import { useAuthGate } from "@/context/auth-gate";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/Spinner";
import { formatPrice, type Listing } from "@/lib/types";

const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  "like-new": "Like new",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { requireAuth } = useAuthGate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [authing, setAuthing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const doc = await getListing(id);
      setListing(doc);
      if (user) setSaved(await isSaved(user.$id, id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load listing");
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    load();
  }, [load]);

  async function ensureUser() {
    if (user) return user;
    setAuthing(true);
    try {
      return await requireAuth();
    } finally {
      setAuthing(false);
    }
  }

  async function onToggleSave() {
    const activeUser = await ensureUser();
    if (!activeUser || !listing) return;
    try {
      setSaved(await toggleSaved(activeUser.$id, listing.$id));
    } catch {
      Alert.alert("Error", "Could not update saved books.");
    }
  }

  async function onChat() {
    const activeUser = await ensureUser();
    if (!activeUser || !listing) return;
    setStartingChat(true);
    try {
      const conversation = await ensureConversation({
        buyerId: activeUser.$id,
        buyerName: activeUser.name,
        sellerId: listing.sellerId,
        sellerName: listing.sellerName,
        listingId: listing.$id,
        listingTitle: listing.title,
      });
      router.push(`/chat/${conversation.$id}`);
    } catch {
      Alert.alert("Error", "Could not start a chat. Try again.");
    } finally {
      setStartingChat(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (error || !listing) {
    return <ErrorState message={error ?? "Listing not found."} onRetry={load} />;
  }

  const isMine = user?.$id === listing.sellerId;

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top }}
      >
        {listing.photos.length > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
          >
            {listing.photos.map((photo) => (
              <Image
                key={photo}
                source={{ uri: photoUrl(photo) }}
                className="h-72 bg-slate-100"
                style={{ width: Dimensions.get("window").width }}
                contentFit="cover"
              />
            ))}
          </ScrollView>
        ) : (
          <View className="h-72 w-full items-center justify-center bg-indigo-50">
            <Text className="text-5xl">📚</Text>
          </View>
        )}

        <View className="gap-4 p-5">
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1 gap-1">
              <Text className="text-2xl font-bold text-slate-900">
                {listing.title}
              </Text>
              <View className="flex-row flex-wrap items-center gap-2">
                <Text className="text-sm text-slate-500">{listing.publisher}</Text>
                <Text className="text-slate-300">•</Text>
                <Text className="text-sm text-slate-500">
                  {listing.edition || "Latest edition"}
                </Text>
              </View>
            </View>
            <Pressable onPress={onToggleSave} hitSlop={8}>
              <Ionicons
                name={saved ? "bookmark" : "bookmark-outline"}
                size={26}
                color={saved ? "#4f46e5" : "#94a3b8"}
              />
            </Pressable>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-3xl font-bold text-indigo-600">
              {formatPrice(listing.price)}
            </Text>
            <View className="rounded-full bg-emerald-50 px-3 py-1">
              <Text className="text-xs font-semibold text-emerald-700">
                {CONDITION_LABELS[listing.condition] ?? listing.condition}
              </Text>
            </View>
          </View>

          {listing.description ? (
            <View className="gap-1">
              <Text className="text-sm font-medium text-slate-700">
                Description
              </Text>
              <Text className="text-sm leading-5 text-slate-600">
                {listing.description}
              </Text>
            </View>
          ) : null}

          <View className="flex-row items-center justify-between rounded-2xl border border-slate-100 p-4">
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-indigo-600">
                <Text className="text-lg font-bold text-white">
                  {listing.sellerName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text className="font-semibold text-slate-900">
                  {listing.sellerName}
                </Text>
                <Text className="text-sm text-slate-500">📍 {listing.city}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {!isMine && (
        <View
          className="border-t border-slate-100 px-5 pt-5"
          style={{ paddingBottom: 20 + insets.bottom }}
        >
          <Button
            title="Message seller"
            onPress={onChat}
            loading={authing || startingChat}
          />
        </View>
      )}
    </View>
  );
}
