import { ActivityIndicator, Text, View } from "react-native";

export function Spinner({ label }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-white">
      <ActivityIndicator size="large" color="#4f46e5" />
      {label ? <Text className="text-sm text-slate-500">{label}</Text> : null}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-white p-6">
      <Text className="text-center text-slate-500">{message}</Text>
      {onRetry ? (
        <Text
          onPress={onRetry}
          className="text-base font-semibold text-indigo-600"
        >
          Retry
        </Text>
      ) : null}
    </View>
  );
}

export function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-white p-8">
      <Text className="text-4xl">{icon}</Text>
      <Text className="text-center text-slate-500">{message}</Text>
    </View>
  );
}
