import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { account, config, IdTokenProvider, isDemo } from "@/lib/appwrite";
import { getDemoUser } from "@/lib/demo-user";
import type { Models } from "react-native-appwrite";
import { GoogleSignin, isSuccessResponse } from "@react-native-google-signin/google-signin";
import { Platform } from "react-native";

export type Profile = Models.User<{
  city?: string;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
}>;
export type ApproximateCoordinates = { latitude: number; longitude: number };

const demoProfile = getDemoUser();

function emailToUserId(email: string): string {
  let h1 = 0xcbf29ce484222325n;
  let h2 = 0x84222325cbf29ce4n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  const lower = email.trim().toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    const c = BigInt(lower.charCodeAt(i));
    h1 = ((h1 ^ c) * prime) & mask;
    h2 = ((h2 ^ (c << 8n)) * prime) & mask;
  }
  return h1.toString(16).padStart(16, "0") + h2.toString(16).padStart(16, "0");
}

interface AuthContextValue {
  user: Profile | null;
  loading: boolean;
  city: string | null;
  coordinates: ApproximateCoordinates | null;
  signOut: () => Promise<void>;
  setLocation: (location: { label: string } & ApproximateCoordinates) => Promise<void>;
  refresh: () => Promise<void>;
  requestEmailToken: (email: string) => Promise<string>;
  verifyEmailToken: (userId: string, secret: string) => Promise<Profile>;
  completeProfile: (name: string) => Promise<Profile>;
  signInWithGoogle: () => Promise<Profile>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [browsingCity, setBrowsingCity] = useState<string | null>(null);
  const [browsingCoordinates, setBrowsingCoordinates] = useState<ApproximateCoordinates | null>(null);

  const refresh = useCallback(async () => {
    if (isDemo) {
      setUser(demoProfile);
      return;
    }
    try {
      setUser(await account.get());
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const signOut = useCallback(async () => {
    if (isDemo) {
      setUser(null);
      return;
    }
    await account.deleteSession({ sessionId: "current" });
    setUser(null);
  }, []);

  const setLocation = useCallback(
    async (location: { label: string } & ApproximateCoordinates) => {
      const { label, latitude, longitude } = location;
      setBrowsingCity(label);
      setBrowsingCoordinates({ latitude, longitude });
      if (!user) return;
      const prefs = { city: label, locationLatitude: latitude, locationLongitude: longitude };
      if (isDemo) {
        demoProfile.prefs = prefs;
        setUser({ ...demoProfile });
        return;
      }
      await account.updatePrefs(prefs);
      setUser(await account.get());
    },
    [user]
  );

  const requestEmailToken = useCallback(async (email: string): Promise<string> => {
    if (isDemo) return "demo-user-id";

    // Appwrite rejects a new passwordless login while the old current session
    // is still active. Clear it so the modal also works for relogin flows.
    try {
      await account.deleteSession({ sessionId: "current" });
    } catch {
      // No active session is fine.
    }
    setUser(null);

    const userId = emailToUserId(email);
    await account.createEmailToken({
      userId,
      email,
      phrase: false,
    });
    return userId;
  }, []);

  const verifyEmailToken = useCallback(
    async (userId: string, secret: string): Promise<Profile> => {
      if (isDemo) {
        setUser(demoProfile);
        return demoProfile;
      }
      await account.createSession({ userId, secret });
      const profile = (await account.get()) as Profile;
      setUser(profile);
      return profile;
    },
    []
  );

  const signInWithGoogle = useCallback(async (): Promise<Profile> => {
    if (Platform.OS === "web") {
      throw new Error("Google native sign-in is available in the installed iOS and Android app.");
    }
    if (isDemo) throw new Error("Google sign-in is unavailable in demo mode.");

    GoogleSignin.configure({ webClientId: config.googleWebClientId });
    await GoogleSignin.hasPlayServices();
    try {
      await GoogleSignin.signOut();
    } catch {
      // No cached Google session is normal for a first-time sign-in.
    }
    const result = await GoogleSignin.signIn();
    if (!isSuccessResponse(result) || !result.data.idToken) {
      throw new Error("Google did not return an ID token. Please try again.");
    }

    try {
      await account.deleteSession({ sessionId: "current" });
    } catch {
      // There may not be an existing Appwrite session.
    }
    await account.createIdTokenSession({
      provider: IdTokenProvider.Google,
      idToken: result.data.idToken,
    });
    const profile = (await account.get()) as Profile;
    setUser(profile);
    return profile;
  }, []);

  const completeProfile = useCallback(
    async (name: string): Promise<Profile> => {
      const cleanName = name.trim();
      if (isDemo) {
        if (cleanName) demoProfile.name = cleanName;
        setUser({ ...demoProfile });
        return { ...demoProfile };
      }
      const updates: Promise<unknown>[] = [];
      if (cleanName && cleanName !== user?.name) {
        updates.push(account.updateName({ name: cleanName }));
      }
      await Promise.all(updates);
      const profile = (await account.get()) as Profile;
      setUser(profile);
      return profile;
    },
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      city: (user?.prefs?.city as string | undefined) ?? browsingCity,
      coordinates:
        typeof user?.prefs?.locationLatitude === "number" &&
        typeof user?.prefs?.locationLongitude === "number"
          ? {
              latitude: user.prefs.locationLatitude,
              longitude: user.prefs.locationLongitude,
            }
          : browsingCoordinates,
      signOut,
      setLocation,
      refresh,
      requestEmailToken,
      verifyEmailToken,
      completeProfile,
      signInWithGoogle,
    }),
    [
      user,
      browsingCity,
      browsingCoordinates,
      loading,
      signOut,
      setLocation,
      refresh,
      requestEmailToken,
      verifyEmailToken,
      completeProfile,
      signInWithGoogle,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
