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
import { TextField } from "@/components/ui/TextField";
import { EmptyState, Spinner } from "@/components/ui/Spinner";
import { formatPrice, type Listing } from "@/lib/types";

export default function ProfileScreen() {
  const { user, city, setCity, signOut } = useAuth();
  const router = useRouter();
  const [draft, setDraft] = useState(city ?? "");
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  async function onSaveCity() {
    setSaving(true);
    try {
      await setCity(draft.trim());
    } catch {
      Alert.alert("Error", "Could not save city.");
    } finally {
      setSaving(false);
    }
  }

  async function onToggleStatus(listing: Listing) {
    setUpdatingId(listing.$id);
    try {
      const next = listing.status === "active" ? "sold" : "active";
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
      <ScrollView className="flex-1 bg-white" contentContainerClassName="p-6 gap-8">
      <View className="items-center gap-3 pt-8">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-indigo-600">
          <Text className="text-3xl font-bold text-white">
            {(user?.name ?? "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="items-center gap-1">
          <Text className="text-xl font-bold text-slate-900">{user?.name}</Text>
          <Text className="text-sm text-slate-500">{user?.email}</Text>
        </View>
      </View>

      <View className="gap-4">
        <Text className="text-lg font-semibold text-slate-900">Your city</Text>
        <Text className="text-sm text-slate-500">
          Listings from your city show up first.
        </Text>
        <TextField
          value={draft}
          onChangeText={setDraft}
          placeholder="e.g. Patna"
          autoCapitalize="words"
        />
        <Button
          title="Save city"
          onPress={onSaveCity}
          loading={saving}
          disabled={!draft.trim() || draft.trim() === city}
        />
      </View>

      <Pressable
        onPress={() => router.push("/saved")}
        className="flex-row items-center justify-between rounded-2xl border border-slate-100 p-4 active:bg-slate-50"
      >
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
            <Ionicons name="bookmark" size={18} color="#4f46e5" />
          </View>
          <Text className="font-semibold text-slate-900">Saved books</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
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
                  {formatPrice(listing.price)} • {listing.city}
                </Text>
                <Text
                  className={[
                    "text-xs font-semibold",
                    listing.status === "active"
                      ? "text-emerald-600"
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
