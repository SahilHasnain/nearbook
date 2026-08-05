import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { useAuth } from "@/context/auth";
import { useAuthGate } from "@/context/auth-gate";
import { Button } from "@/components/ui/Button";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { requireAuth } = useAuthGate();
  const [loading, setLoading] = useState(false);

  if (user) return <>{children}</>;

  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <View className="gap-3">
        <Text className="text-center text-3xl">📚</Text>
        <Text className="text-center text-xl font-bold text-slate-900">
          Sign in to continue
        </Text>
        <Text className="text-center text-sm leading-5 text-slate-500">
          {"Just your email — we'll send a one-time code. No password needed."}
        </Text>
      </View>
      <Button
        title="Continue"
        className="mt-8 w-full"
        loading={loading}
        onPress={async () => {
          setLoading(true);
          try {
            await requireAuth();
          } finally {
            setLoading(false);
          }
        }}
      />
    </View>
  );
}
