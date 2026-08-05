import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { listListings, type ListingFilters } from "@/lib/api";
import { ListingCard } from "@/components/ListingCard";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/Spinner";
import { CONDITIONS, PUBLISHERS, SUBJECTS, type Condition } from "@/lib/types";
import { useAuth } from "@/context/auth";

type Subject = (typeof SUBJECTS)[number] | "All";

const CONDITION_LABELS: Record<Condition, string> = {
  new: "New",
  "like-new": "Like new",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

export default function HomeScreen() {
  const { city } = useAuth();
  const [listings, setListings] = useState<Awaited<ReturnType<typeof listListings>>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [subject, setSubject] = useState<Subject>("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<ListingFilters>({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setError(null);
    setRefreshing(true);
    try {
      const data = await listListings({
        ...filters,
        subject: subject === "All" ? undefined : subject,
        search: debouncedSearch || undefined,
      });
      const cityKey = city?.trim().toLowerCase();
      setListings(
        cityKey
          ? [
              ...data.filter((l) => l.city.toLowerCase() === cityKey),
              ...data.filter((l) => l.city.toLowerCase() !== cityKey),
            ]
          : data
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load listings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, debouncedSearch, city, subject]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View className="flex-1 bg-white">
      <View className="gap-4 px-5 pb-3 pt-16">
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-2xl font-bold text-slate-900">NearBook</Text>
            {city ? (
              <Text className="text-sm text-slate-500">📍 {city}</Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => setFilterOpen(true)}
            className="flex-row items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5"
          >
            <Text className="text-xs font-medium text-slate-600">Filter</Text>
            {filters.publisher || filters.condition || filters.maxPrice ? (
              <Text className="text-xs font-bold text-indigo-600">●</Text>
            ) : null}
          </Pressable>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search books…"
          placeholderTextColor="#94a3b8"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2"
        >
          {["All", ...SUBJECTS].map((s) => {
            const active = subject === s;
            return (
              <Pressable
                key={s}
                onPress={() => setSubject(s as Subject)}
                className={[
                  "rounded-full px-4 py-2",
                  active ? "bg-indigo-600" : "bg-slate-100",
                ].join(" ")}
              >
                <Text
                  className={[
                    "text-sm font-medium",
                    active ? "text-white" : "text-slate-600",
                  ].join(" ")}
                >
                  {s}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <Spinner label="Loading books…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : listings.length === 0 ? (
        <EmptyState
          icon="🔍"
          message="No books found. Try changing your filters or search."
        />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.$id}
          renderItem={({ item }) => <ListingCard listing={item} />}
          contentContainerClassName="gap-4 px-5 pb-8"
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={load}
        />
      )}

      <FilterModal
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onChange={setFilters}
      />
    </View>
  );
}

function FilterModal({
  visible,
  onClose,
  filters,
  onChange,
}: {
  visible: boolean;
  onClose: () => void;
  filters: ListingFilters;
  onChange: (f: ListingFilters) => void;
}) {
  const [publisher, setPublisher] = useState(filters.publisher ?? "");
  const [condition, setCondition] = useState(filters.condition ?? "");
  const [maxPrice, setMaxPrice] = useState(
    filters.maxPrice != null ? String(filters.maxPrice) : ""
  );

  useEffect(() => {
    if (!visible) return;
    setPublisher(filters.publisher ?? "");
    setCondition(filters.condition ?? "");
    setMaxPrice(filters.maxPrice != null ? String(filters.maxPrice) : "");
  }, [visible, filters]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40" onPress={onClose}>
        <Pressable className="mt-auto rounded-t-3xl bg-white p-6">
          <Text className="mb-4 text-lg font-bold text-slate-900">Filters</Text>

          <Text className="mb-2 text-sm font-medium text-slate-700">Publisher</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <View className="flex-row gap-2">
              {PUBLISHERS.map((p) => (
                <Chip
                  key={p}
                  label={p}
                  active={publisher === p}
                  onPress={() => setPublisher(publisher === p ? "" : p)}
                />
              ))}
            </View>
          </ScrollView>

          <Text className="mb-2 text-sm font-medium text-slate-700">Condition</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <View className="flex-row gap-2">
              {CONDITIONS.map((c) => (
                <Chip
                  key={c}
                  label={CONDITION_LABELS[c]}
                  active={condition === c}
                  onPress={() => setCondition(condition === c ? "" : c)}
                />
              ))}
            </View>
          </ScrollView>

          <Text className="mb-2 text-sm font-medium text-slate-700">
            Max price
          </Text>
          <TextInput
            value={maxPrice}
            onChangeText={setMaxPrice}
            keyboardType="number-pad"
            placeholder="e.g. 500"
            placeholderTextColor="#94a3b8"
            className="mb-6 rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900"
          />

          <View className="flex-row gap-3">
            <Pressable
              onPress={() => {
                setPublisher("");
                setCondition("");
                setMaxPrice("");
                onChange({});
              }}
              className="flex-1 items-center rounded-xl bg-slate-100 py-3"
            >
              <Text className="font-semibold text-slate-600">Clear</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onChange({
                  publisher: publisher || undefined,
                  condition: (condition || undefined) as Condition | undefined,
                  maxPrice: maxPrice ? Number(maxPrice) : undefined,
                });
                onClose();
              }}
              className="flex-1 items-center rounded-xl bg-indigo-600 py-3"
            >
              <Text className="font-semibold text-white">Apply</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        "rounded-full px-3 py-2",
        active ? "bg-indigo-600" : "bg-slate-100",
      ].join(" ")}
    >
      <Text
        className={[
          "text-sm font-medium",
          active ? "text-white" : "text-slate-600",
        ].join(" ")}
      >
        {label}
      </Text>
    </Pressable>
  );
}
