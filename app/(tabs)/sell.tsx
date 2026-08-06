import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createListing, deletePhoto, uploadPhotos } from "@/lib/api";
import { useAuth } from "@/context/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { CONDITIONS, PUBLISHERS, SUBJECTS, type Condition } from "@/lib/types";

const MAX_PHOTOS = 4;

export default function SellScreen() {
  const { user, city } = useAuth();
  const router = useRouter();

  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<string>(SUBJECTS[0]);
  const [publisher, setPublisher] = useState("");
  const [edition, setEdition] = useState("");
  const [condition, setCondition] = useState<Condition>("good");
  const [price, setPrice] = useState("");
  const [sellerCity, setSellerCity] = useState(city ?? "");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bottomPad, setBottomPad] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const focusedFieldRef = useRef<"city" | "description" | null>(null);
  const keyboardHeightRef = useRef(0);

  useEffect(() => {
    ImagePicker.requestMediaLibraryPermissionsAsync();
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      keyboardHeightRef.current = e.endCoordinates.height;
      if (focusedFieldRef.current) {
        setBottomPad(e.endCoordinates.height);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
      }
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setBottomPad(0);
      focusedFieldRef.current = null;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  function focusBottomField(field: "city" | "description") {
    focusedFieldRef.current = field;
    if (keyboardHeightRef.current > 0) {
      setBottomPad(keyboardHeightRef.current);
    }
    // Scroll after the keyboard has resized the viewport so the next field is reachable.
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 350);
  }

  function addAssets(assets: ImagePicker.ImagePickerAsset[]) {
    setPhotos((prev) => [...prev, ...assets].slice(0, MAX_PHOTOS));
  }

  async function onTakePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Camera access needed",
        "Enable camera access to take a photo of your book."
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    if (!result.canceled) addAssets(result.assets);
  }

  async function onPickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.8,
    });
    if (!result.canceled) addAssets(result.assets);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setPhotos([]);
    setTitle("");
    setSubject(SUBJECTS[0]);
    setPublisher("");
    setEdition("");
    setCondition("good");
    setPrice("");
    setSellerCity(city ?? "");
    setDescription("");
    setBottomPad(0);
    focusedFieldRef.current = null;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  async function onSubmit() {
    if (!user) return;
    const priceNum = Number(price);
    if (!title.trim() || !publisher.trim() || !Number.isFinite(priceNum) || priceNum <= 0) {
      Alert.alert("Incomplete", "Fill in the book name, publisher, and a valid price.");
      return;
    }
    setSubmitting(true);
    let photoIds: string[] = [];
    try {
      photoIds = await uploadPhotos(
        photos.map((p) => ({
          uri: p.uri,
          name: p.fileName ?? `photo-${Date.now()}.jpg`,
          type: p.mimeType ?? "image/jpeg",
          size: p.fileSize ?? 0,
        })),
        user.$id
      );
      await createListing(
        {
          title: title.trim(),
          subject,
          publisher: publisher.trim(),
          edition: edition.trim(),
          condition,
          price: priceNum,
          city: sellerCity.trim(),
          description: description.trim() || undefined,
          photos: photoIds,
        },
        { $id: user.$id, name: user.name }
      );
      resetForm();
      Alert.alert("Listed!", "Your book is now live.", [
        { text: "OK", onPress: () => router.replace("/") },
      ]);
    } catch {
      for (const id of photoIds) {
        try {
          await deletePhoto(id);
        } catch {
          // best-effort cleanup; orphaned file will be cleaned up manually
        }
      }
      Alert.alert("Error", "Could not publish your listing. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    title.trim() &&
    publisher.trim() &&
    Number.isFinite(Number(price)) &&
    Number(price) > 0 &&
    sellerCity.trim().length > 0;

  return (
    <RequireAuth>
      <ScrollView
        ref={scrollRef}
        className="flex-1 bg-white"
        contentContainerClassName="gap-6 p-5"
        contentContainerStyle={{ paddingBottom: 40 + bottomPad }}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
      >
      <Text className="pt-10 text-2xl font-bold text-slate-900">Sell a book</Text>

      <View className="gap-2">
        <Text className="text-sm font-medium text-slate-700">Photos</Text>
        <View className="flex-row flex-wrap gap-3">
          {photos.map((photo, i) => (
            <View key={photo.assetId ?? i} className="relative">
              <Image
                source={{ uri: photo.uri } as ImageSourcePropType}
                className="h-24 w-24 rounded-xl bg-slate-100"
                contentFit="cover"
              />
              <Pressable
                onPress={() => removePhoto(i)}
                className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full bg-slate-900"
              >
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
            </View>
          ))}
          {photos.length < MAX_PHOTOS ? (
            <>
              <Pressable
                onPress={onTakePhoto}
                className="h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50"
              >
                <Ionicons name="camera" size={26} color="#4f46e5" />
                <Text className="mt-1 text-xs font-medium text-indigo-600">
                  Take photo
                </Text>
              </Pressable>
              <Pressable
                onPress={onPickFromLibrary}
                className="h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50"
              >
                <Ionicons name="images-outline" size={26} color="#64748b" />
                <Text className="mt-1 text-xs text-slate-500">Gallery</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>

      <TextField
        label="Book name"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. MTG Biology for NEET"
      />

      <View className="gap-2">
        <Text className="text-sm font-medium text-slate-700">Subject</Text>
        <View className="flex-row flex-wrap gap-2">
          {SUBJECTS.map((s) => (
            <Chip
              key={s}
              label={s}
              active={subject === s}
              onPress={() => setSubject(s)}
            />
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-slate-700">Publisher</Text>
        <View className="flex-row flex-wrap gap-2">
          {PUBLISHERS.map((p) => (
            <Chip
              key={p}
              label={p}
              active={publisher === p}
              onPress={() => setPublisher(publisher === p ? "" : p)}
            />
          ))}
        </View>
      </View>

      <View className="gap-4">
        <TextField
          label="Edition"
          value={edition}
          onChangeText={setEdition}
          placeholder="e.g. 2024 or 5th edition"
        />

        <View className="gap-2">
          <Text className="text-sm font-medium text-slate-700">Condition</Text>
          <View className="flex-row flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <Chip
                key={c}
                label={c.replace("-", " ")}
                active={condition === c}
                onPress={() => setCondition(c)}
              />
            ))}
          </View>
        </View>

        <TextField
          label="Price (₹)"
          value={price}
          onChangeText={setPrice}
          keyboardType="number-pad"
          placeholder="e.g. 450"
        />

        <TextField
          label="City"
          value={sellerCity}
          onChangeText={setSellerCity}
          autoCapitalize="words"
          placeholder="e.g. Patna"
          onFocus={() => focusBottomField("city")}
        />

        <View className="gap-1.5">
          <Text className="text-sm font-medium text-slate-700">Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Condition details, marks on pages, etc. (optional)"
            placeholderTextColor="#94a3b8"
            multiline
            onFocus={() => focusBottomField("description")}
            className="min-h-[100px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
          />
        </View>
      </View>

      <Button
        title="Publish listing"
        onPress={onSubmit}
        loading={submitting}
        disabled={!canSubmit}
      />
      </ScrollView>
    </RequireAuth>
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
          "text-sm font-medium capitalize",
          active ? "text-white" : "text-slate-600",
        ].join(" ")}
      >
        {label}
      </Text>
    </Pressable>
  );
}
