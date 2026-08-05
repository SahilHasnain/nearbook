import { useCallback, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { getListing, listSavedListingIds } from "@/lib/api";
import { useAuth } from "@/context/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { ListingCard } from "@/components/ListingCard";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/Spinner";
import type { Listing } from "@/lib/types";

export default function SavedScreen() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const ids = await listSavedListingIds(user.$id);
      const docs = await Promise.all(
        ids.map((listingId) => getListing(listingId).catch(() => null))
      );
      setListings(docs.filter((d): d is Listing => d !== null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load saved books");
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
        <Spinner label="Loading saved books…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <View className="flex-1 bg-white">
          <FlatList
            data={listings}
            keyExtractor={(item) => item.$id}
            contentContainerClassName="gap-4 px-5 pb-8"
            ListHeaderComponent={
              <Text className="pb-3 pt-16 text-2xl font-bold text-slate-900">
                Saved books
              </Text>
            }
            renderItem={({ item }) => <ListingCard listing={item} />}
            ListEmptyComponent={
              <EmptyState icon="🔖" message="Save books here to find them later." />
            }
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </RequireAuth>
  );
}
