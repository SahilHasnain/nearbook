import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useAuth, type Profile } from "@/context/auth";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (profile: Profile) => void;
}

type Step = "email" | "otp" | "name";

export function AuthModal({ visible, onClose, onSuccess }: AuthModalProps) {
  const { requestEmailToken, verifyEmailToken, completeProfile } = useAuth();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setStep("email");
      setEmail("");
      setCode("");
      setUserId("");
      setName("");
      setCity("");
      setError(null);
      setLoading(false);
    }
  }, [visible]);

  async function sendCode() {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email to continue.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setUserId(await requestEmailToken(trimmed));
      setStep("otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the code.");
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Enter the 6-digit code.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const profile = await verifyEmailToken(userId, trimmed);
      if (!profile.name?.trim()) {
        setName("");
        setStep("name");
      } else {
        onSuccess(profile);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "That code didn't work.");
    } finally {
      setLoading(false);
    }
  }

  async function finishProfile() {
    if (!name.trim()) {
      setError("Tell us your name to continue.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      onSuccess(await completeProfile(name, city || undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your profile.");
    } finally {
      setLoading(false);
    }
  }

  const titles: Record<Step, string> = {
    email: "Sign in to continue",
    otp: "Check your inbox",
    name: "One last thing",
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end"
      >
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />

        <View className="gap-5 rounded-t-3xl bg-white p-6 pb-10">
          <View className="h-1 w-10 self-center rounded-full bg-slate-200" />
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-slate-900">
              {titles[step]}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text className="text-xl text-slate-400">✕</Text>
            </Pressable>
          </View>

          {step === "email" && (
            <Text className="text-sm leading-5 text-slate-500">
              {"Message sellers and save books — no password needed. We'll email you a one-time code."}
            </Text>
          )}
          {step === "otp" && (
            <Text className="text-sm leading-5 text-slate-500">
              {"We sent a 6-digit code to "}
              <Text className="font-semibold text-slate-700">{email}</Text>
              {". Enter it below (valid for 15 minutes)."}
            </Text>
          )}
          {step === "name" && (
            <Text className="text-sm leading-5 text-slate-500">
              {"Sellers will see your name when you message them."}
            </Text>
          )}

          {step === "email" && (
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              error={error ?? undefined}
            />
          )}

          {step === "otp" && (
            <TextField
              label="Verification code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="123456"
              error={error ?? undefined}
            />
          )}

          {step === "name" && (
            <View className="gap-4">
              <TextField
                label="Full name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                placeholder="Your name"
                error={error ?? undefined}
              />
              <TextField
                label="City (optional)"
                value={city}
                onChangeText={setCity}
                autoCapitalize="words"
                placeholder="e.g. Patna"
              />
            </View>
          )}

          {step === "otp" && (
            <Pressable
              onPress={() => {
                setError(null);
                setStep("email");
              }}
            >
              <Text className="text-center text-sm text-indigo-600">
                Change email
              </Text>
            </Pressable>
          )}

          <Button
            title={
              step === "email"
                ? "Send code"
                : step === "otp"
                  ? "Verify & continue"
                  : "Finish"
            }
            onPress={
              step === "email" ? sendCode : step === "otp" ? verify : finishProfile
            }
            loading={loading}
            disabled={
              loading ||
              (step === "email" && !email.trim()) ||
              (step === "otp" && !code.trim()) ||
              (step === "name" && !name.trim())
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
