import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { account, isDemo } from "@/lib/appwrite";
import { getDemoUser } from "@/lib/demo-user";
import type { Models } from "react-native-appwrite";

export type Profile = Models.User<{ city?: string }>;

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
  signOut: () => Promise<void>;
  setCity: (city: string) => Promise<void>;
  refresh: () => Promise<void>;
  requestEmailToken: (email: string) => Promise<string>;
  verifyEmailToken: (userId: string, secret: string) => Promise<Profile>;
  completeProfile: (name: string, city?: string) => Promise<Profile>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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

  const setCity = useCallback(
    async (city: string) => {
      if (isDemo) {
        demoProfile.prefs = { city };
        setUser({ ...demoProfile });
        return;
      }
      await account.updatePrefs({ city });
      setUser(await account.get());
    },
    []
  );

  const requestEmailToken = useCallback(async (email: string): Promise<string> => {
    if (isDemo) return "demo-user-id";
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

  const completeProfile = useCallback(
    async (name: string, city?: string): Promise<Profile> => {
      const cleanName = name.trim();
      const cleanCity = city?.trim();
      if (isDemo) {
        if (cleanName) demoProfile.name = cleanName;
        if (cleanCity) demoProfile.prefs = { city: cleanCity };
        setUser({ ...demoProfile });
        return { ...demoProfile };
      }
      const updates: Promise<unknown>[] = [];
      if (cleanName && cleanName !== user?.name) {
        updates.push(account.updateName({ name: cleanName }));
      }
      if (cleanCity) {
        updates.push(account.updatePrefs({ city: cleanCity }));
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
      city: (user?.prefs?.city as string | undefined) ?? null,
      signOut,
      setCity,
      refresh,
      requestEmailToken,
      verifyEmailToken,
      completeProfile,
    }),
    [
      user,
      loading,
      signOut,
      setCity,
      refresh,
      requestEmailToken,
      verifyEmailToken,
      completeProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
