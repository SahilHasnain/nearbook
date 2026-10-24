import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { listMyListings, setListingStatus } from "@/lib/api";
import { useAuth } from "@/context/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/Button";
import { EmptyState, Spinner } from "@/components/ui/Spinner";
import { formatPrice, type Listing } from "@/lib/types";
import { requestApproximateCity } from "@/lib/location";
import { colors } from "@/lib/theme";
import { getDeviceRegion } from "@/lib/regional-settings";

export default function ProfileScreen() {
  const { user, city, setLocation, signOut } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const deviceRegion = getDeviceRegion();

  const loadListings = useCallback(async () => {
    if (!user) return;
    setLoadingListings(true);
    try {
      setListings(await listMyListings(user.$id));
    } catch {
      Alert.alert("Error", "Could not load your listings.");
    } finally {
      setLoadingListings(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadListings();
    }, [loadListings])
  );

  async function onUseLocation() {
    setLocating(true);
    try {
      const detectedLocation = await requestApproximateCity();
      await setLocation(detectedLocation);
    } catch (error) {
      Alert.alert(
        "Location unavailable",
          error instanceof Error ? error.message : "Please try again or check location permission."
      );
    } finally {
      setLocating(false);
    }
  }

  async function onToggleStatus(listing: Listing) {
    const next = listing.status === "active" ? "sold" : "active";
    if (next === "sold") {
      Alert.alert(
        "Mark book as sold?",
        "This will remove the listing from the active marketplace.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Mark sold",
            style: "destructive",
            onPress: () => {
              void updateListingStatus(listing, next);
            },
          },
        ]
      );
      return;
    }

    await updateListingStatus(listing, next);
  }

  async function updateListingStatus(listing: Listing, next: Listing["status"]) {
    setUpdatingId(listing.$id);
    try {
      await setListingStatus(listing.$id, next);
      setListings((prev) =>
        prev.map((l) => (l.$id === listing.$id ? { ...l, status: next } : l))
      );
    } catch {
      Alert.alert("Error", "Could not update listing.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function onSignOut() {
    setLoggingOut(true);
    try {
      await signOut();
    } catch {
      Alert.alert("Error", "Could not sign out.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <RequireAuth>
      <ScrollView className="flex-1 bg-amber-50" contentContainerClassName="p-6 gap-8">
      <View className="items-center gap-3 pt-8">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-amber-700">
          <Text className="text-3xl font-bold text-slate-900">
            {(user?.name ?? "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="items-center gap-1">
          <Text className="text-xl font-bold text-slate-900">{user?.name}</Text>
          <Text className="text-sm text-slate-500">{user?.email}</Text>
        </View>
      </View>

      <View className="gap-4">
        <Text className="text-lg font-semibold text-slate-900">Your location</Text>
        <Text className="text-sm text-slate-500">
          {city ? `📍 ${city}` : "Location not set"}
        </Text>
        <Button
          title={locating ? "Finding your location…" : city ? "Update Location" : "Find Location"}
          variant="secondary"
          onPress={onUseLocation}
          loading={locating}
        />
      </View>

      <View className="gap-1 rounded-2xl border border-slate-100 bg-white p-4">
        <Text className="font-semibold text-slate-900">Regional settings</Text>
        <Text className="text-sm text-slate-600">
          {deviceRegion.regionName ?? "Region unavailable"} · {deviceRegion.currencyCode}
        </Text>
        <Text className="text-xs leading-5 text-slate-500">
          Listing prices use the seller’s currency. Your device region sets the default currency when you list a book.
        </Text>
      </View>

      <Pressable
        onPress={() => router.push("/saved")}
        className="flex-row items-center justify-between rounded-2xl border border-slate-100 p-4 active:bg-slate-50"
      >
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-amber-50">
            <Ionicons name="bookmark" size={18} color={colors.amber700} />
          </View>
          <Text className="font-semibold text-slate-900">Saved books</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.slate400} />
      </Pressable>

      <View className="gap-3">
        <Text className="text-lg font-semibold text-slate-900">My listings</Text>
        {loadingListings ? (
          <Spinner label="Loading…" />
        ) : listings.length === 0 ? (
          <EmptyState icon="📚" message="You haven't listed any books yet." />
        ) : (
          listings.map((listing) => (
            <Pressable
              key={listing.$id}
              onPress={() => router.push(`/listing/${listing.$id}`)}
              className="flex-row items-center justify-between rounded-2xl border border-slate-100 p-4 active:bg-slate-50"
            >
              <View className="flex-1 gap-0.5 pr-3">
                <Text className="font-semibold text-slate-900" numberOfLines={1}>
                  {listing.title}
                </Text>
                <Text className="text-sm text-slate-500">
                  {formatPrice(listing.price, listing.currencyCode)} • {listing.city}
                </Text>
                <Text
                  className={[
                    "text-xs font-semibold",
                    listing.status === "active"
                      ? "text-slate-800"
                      : "text-slate-400",
                  ].join(" ")}
                >
                  {listing.status === "active" ? "Active" : "Sold"}
                </Text>
              </View>
              <Button
                title={listing.status === "active" ? "Mark sold" : "Relist"}
                variant="secondary"
                loading={updatingId === listing.$id}
                onPress={() => onToggleStatus(listing)}
              />
            </Pressable>
          ))
        )}
      </View>

      <Button
        title="Sign out"
        variant="danger"
        onPress={onSignOut}
        loading={loggingOut}
      />
      </ScrollView>
    </RequireAuth>
  );
}
