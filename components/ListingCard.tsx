import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { photoUrl } from "@/lib/api";
import { formatPrice, type Listing } from "@/lib/types";

export function ListingCard({ listing }: { listing: Listing }) {
  const router = useRouter();
  const cover = listing.photos[0];

  return (
    <Pressable
      onPress={() => router.push(`/listing/${listing.$id}`)}
      className="overflow-hidden rounded-2xl border border-slate-100 bg-white active:bg-slate-50"
    >
      {cover ? (
        <Image
          source={{ uri: photoUrl(cover) }}
          className="h-40 w-full bg-slate-100"
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View className="h-40 w-full items-center justify-center bg-indigo-50">
          <Text className="text-3xl">📚</Text>
        </View>
      )}
      <View className="gap-1 p-3">
        <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>
          {listing.title}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-xs text-slate-500">{listing.publisher}</Text>
          {listing.edition ? (
            <>
              <Text className="text-xs text-slate-300">•</Text>
              <Text className="text-xs text-slate-500">{listing.edition}</Text>
            </>
          ) : null}
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-bold text-indigo-600">
            {formatPrice(listing.price)}
          </Text>
          <View className="flex-row items-center gap-1">
            <Text className="text-xs text-slate-400">📍</Text>
            <Text className="text-xs text-slate-500">{listing.city}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
