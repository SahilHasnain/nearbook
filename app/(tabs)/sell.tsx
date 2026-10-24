import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from "react-native";
import { Image } from "expo-image";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createListing, deletePhoto, uploadPhotos } from "@/lib/api";
import { useAuth } from "@/context/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { CONDITIONS, PUBLISHERS, SUBJECTS, type Condition } from "@/lib/types";
import { requestApproximateCity } from "@/lib/location";
import { colors } from "@/lib/theme";

const MAX_PHOTOS = 4;

export default function SellScreen() {
  const { user, city, coordinates, setLocation } = useAuth();
  const router = useRouter();

  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<string>(SUBJECTS[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [categoryIsCustom, setCategoryIsCustom] = useState(false);
  const [publisher, setPublisher] = useState("");
  const [customPublisher, setCustomPublisher] = useState("");
  const [publisherIsCustom, setPublisherIsCustom] = useState(false);
  const [edition, setEdition] = useState("");
  const [condition, setCondition] = useState<Condition>("good");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sunniSeller, setSunniSeller] = useState<boolean | null>(null);
  const [locating, setLocating] = useState(false);
  const [bottomPad, setBottomPad] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const focusedFieldRef = useRef<"description" | null>(null);
  const keyboardHeightRef = useRef(0);
  const locationPromptedRef = useRef(false);

  const onUseCurrentLocation = useCallback(async () => {
    setLocating(true);
    try {
      await setLocation(await requestApproximateCity());
    } catch (error) {
      Alert.alert(
        "Location unavailable",
        error instanceof Error ? error.message : "Try again or check location permission."
      );
    } finally {
      setLocating(false);
    }
  }, [setLocation]);

  useFocusEffect(
    useCallback(() => {
      if (!user || sunniSeller !== true || (city && coordinates) || locationPromptedRef.current) return;
      locationPromptedRef.current = true;
      Alert.alert(
        "Location required to sell",
        "Set your approximate location before creating a listing so buyers can see how far away it is.",
        [
          {
            text: "Use approximate location",
            onPress: () => {
              void onUseCurrentLocation();
            },
          },
          { text: "Not now", style: "cancel" },
        ]
      );
    }, [user, sunniSeller, city, coordinates, onUseCurrentLocation])
  );

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

  function focusBottomField(field: "description") {
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
    setCustomCategory("");
    setCategoryIsCustom(false);
    setPublisher("");
    setCustomPublisher("");
    setPublisherIsCustom(false);
    setEdition("");
    setCondition("good");
    setPrice("");
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
      const files = await Promise.all(
        photos.map(async (photo, index) => {
          const size = photo.fileSize ?? new File(photo.uri).info().size;
          if (!size || size <= 0) {
            throw new Error(`Could not read the selected image ${index + 1}.`);
          }

          return {
            uri: photo.uri,
            name: photo.fileName ?? `photo-${Date.now()}-${index}.jpg`,
            type: photo.mimeType ?? "image/jpeg",
            size,
          };
        })
      );
      photoIds = await uploadPhotos(
        files,
        user.$id
      );
      await createListing(
        {
          title: title.trim(),
          subject: categoryIsCustom ? customCategory.trim() : subject,
          publisher: publisherIsCustom ? customPublisher.trim() : publisher.trim(),
          edition: edition.trim(),
          condition,
          price: priceNum,
          city: city!.trim(),
          locationLatitude: coordinates!.latitude,
          locationLongitude: coordinates!.longitude,
          description: description.trim() || undefined,
          photos: photoIds,
        },
        { $id: user.$id, name: user.name }
      );
      resetForm();
      Alert.alert("Listed!", "Your book is now live.", [
        { text: "OK", onPress: () => router.replace("/") },
      ]);
    } catch (error) {
      console.error("[sell] Could not publish listing", error);
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
    (publisherIsCustom ? customPublisher.trim() : publisher.trim()) &&
    (!categoryIsCustom || customCategory.trim()) &&
    Number.isFinite(Number(price)) &&
    Number(price) > 0 &&
    Boolean(city?.trim() && coordinates);

  return (
    <RequireAuth>
      {sunniSeller === null ? (
        <View className="flex-1 items-center justify-center gap-4 bg-amber-50 px-8">
          <Text className="text-center text-2xl font-bold text-slate-900">Seller eligibility</Text>
          <Text className="text-center text-base leading-6 text-slate-600">
            Are you a Sunni (Barelvi) Muslim? Only Sunni users are eligible to sell books on Sunni NearBook.
          </Text>
          <Button
            title="Yes, continue"
            onPress={() => setSunniSeller(true)}
            className="w-full rounded-2xl"
          />
          <Button
            title="No"
            variant="secondary"
            onPress={() => setSunniSeller(false)}
            className="w-full rounded-2xl"
          />
        </View>
      ) : sunniSeller === false ? (
        <View className="flex-1 items-center justify-center gap-4 bg-amber-50 px-8">
          <Text className="text-center text-2xl font-bold text-slate-900">Not eligible to sell</Text>
          <Text className="text-center text-base leading-6 text-slate-600">
            Sorry, you are not eligible to sell books on Sunni NearBook.
          </Text>
          <Button
            title="Back to browsing"
            onPress={() => router.replace("/")}
            className="w-full rounded-2xl"
          />
          <Button
            title="Change my answer"
            variant="secondary"
            onPress={() => setSunniSeller(null)}
            className="w-full rounded-2xl"
          />
        </View>
      ) : !city || !coordinates ? (
        <View className="flex-1 items-center justify-center gap-4 bg-slate-50 px-8">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Ionicons name="location-outline" size={30} color={colors.amber800} />
          </View>
          <Text className="text-center text-xl font-bold text-slate-900">Location needed to sell</Text>
          <Text className="text-center text-sm leading-5 text-slate-500">
            Set your approximate location first. It will be added to your listings so buyers can see an estimated distance.
          </Text>
          <Button
            title={locating ? "Finding location…" : "Use current location"}
            onPress={onUseCurrentLocation}
            loading={locating}
            className="w-full rounded-2xl bg-amber-700"
          />
        </View>
      ) : (
      <ScrollView
        ref={scrollRef}
        className="flex-1 bg-amber-50"
        contentContainerClassName="gap-5 px-5 pb-8 pt-14"
        contentContainerStyle={{ paddingBottom: 40 + bottomPad }}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
      >
      <View className="gap-1 pb-1">
        <Text className="text-3xl font-bold tracking-tight text-slate-900">List a book</Text>
        <Text className="text-sm leading-5 text-slate-500">
          Share a good read with someone nearby.
        </Text>
      </View>

      <View className="gap-3 rounded-2xl border border-slate-100 bg-white p-4">
        <View className="flex-row items-center justify-between">
          <View className="gap-0.5">
            <Text className="text-base font-semibold text-slate-900">Book photos</Text>
            <Text className="text-xs text-slate-500">Add up to {MAX_PHOTOS} clear photos</Text>
          </View>
          <Text className="text-xs font-medium text-slate-400">{photos.length}/{MAX_PHOTOS}</Text>
        </View>
        <View className="flex-row flex-wrap gap-2.5">
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
                <Ionicons name="close" size={14} color={colors.white} />
              </Pressable>
            </View>
          ))}
          {photos.length < MAX_PHOTOS ? (
            <>
              <Pressable
                onPress={onTakePhoto}
                className="h-24 w-24 items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50"
              >
                <Ionicons name="camera" size={23} color={colors.amber800} />
                <Text className="mt-1 text-xs font-medium text-slate-800">
                  Camera
                </Text>
              </Pressable>
              <Pressable
                onPress={onPickFromLibrary}
                className="h-24 w-24 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50"
              >
                <Ionicons name="images-outline" size={26} color={colors.slate500} />
                <Text className="mt-1 text-xs text-slate-500">Gallery</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>

      <View className="gap-5 rounded-2xl border border-slate-100 bg-white p-4">
        <Text className="text-base font-semibold text-slate-900">Book details</Text>
        <TextField
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Kanzul Iman"
          autoCapitalize="words"
        />

        <DropdownField
          label="Category"
          value={categoryIsCustom ? "Custom category" : subject}
          placeholder="Choose a category"
          options={SUBJECTS}
          onSelect={(value) => {
            if (value === "__custom__") {
              setCategoryIsCustom(true);
              setSubject("");
            } else {
              setCategoryIsCustom(false);
              setCustomCategory("");
              setSubject(value);
            }
          }}
        />
        {categoryIsCustom ? (
          <TextField
            label="Custom category"
            value={customCategory}
            onChangeText={setCustomCategory}
            placeholder="Enter a category"
          />
        ) : null}

        <DropdownField
          label="Publisher"
          value={publisherIsCustom ? "Custom publisher" : publisher}
          placeholder="Choose a publisher"
          options={PUBLISHERS}
          onSelect={(value) => {
            if (value === "__custom__" || value === "Other") {
              setPublisherIsCustom(true);
              setPublisher("Other");
            } else {
              setPublisherIsCustom(false);
              setCustomPublisher("");
              setPublisher(value);
            }
          }}
        />
        {publisherIsCustom ? (
          <TextField
            label="Custom publisher"
            value={customPublisher}
            onChangeText={setCustomPublisher}
            placeholder="Enter the publisher name"
          />
        ) : null}

        <TextField
          label="Edition"
          value={edition}
          onChangeText={setEdition}
          placeholder="e.g. 2024 or 5th edition (optional)"
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

        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField
              label="Price (₹)"
              value={price}
              onChangeText={setPrice}
              keyboardType="number-pad"
              placeholder="e.g. 450"
            />
          </View>

        </View>
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-slate-700">Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Share the book’s condition or any notes (optional)"
            placeholderTextColor={colors.slate400}
            multiline
            onFocus={() => focusBottomField("description")}
            className="min-h-[100px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
          />
        </View>
      </View>

      <Button
        title={submitting ? "Publishing…" : "Publish book listing"}
        onPress={onSubmit}
        loading={submitting}
        disabled={!canSubmit}
        className="rounded-2xl bg-amber-700 py-4 active:bg-amber-800"
      />
      </ScrollView>
      )}
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
        active ? "bg-amber-700" : "bg-slate-100",
      ].join(" ")}
    >
      <Text
        className={[
          "text-sm font-medium capitalize",
        active ? "text-slate-900" : "text-slate-600",
        ].join(" ")}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DropdownField({
  label,
  value,
  placeholder,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: readonly string[];
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-slate-700">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        className="min-h-12 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
      >
        <Text className={value ? "text-base text-slate-900" : "text-base text-slate-400"}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.slate500} />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <Pressable className="flex-1" onPress={() => setOpen(false)} />
          <View className="max-h-[70%] rounded-t-3xl bg-white px-5 pb-8 pt-5">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-slate-900">Select {label.toLowerCase()}</Text>
              <Pressable onPress={() => setOpen(false)} className="p-2">
                <Ionicons name="close" size={22} color={colors.slate500} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[...options, "__custom__"].map((option) => {
                const isCustom = option === "__custom__";
                const text = isCustom ? "＋ Add custom" : option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => {
                      onSelect(option);
                      setOpen(false);
                    }}
                    className="border-b border-slate-100 py-4"
                  >
                    <Text className="text-base font-medium text-slate-800">{text}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
