import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth, type Profile } from "@/context/auth";
import { AuthModal } from "@/components/AuthModal";

interface AuthGateContextValue {
  requireAuth: () => Promise<Profile | null>;
}

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const resolverRef = useRef<((profile: Profile | null) => void) | null>(null);

  const requireAuth = useCallback((): Promise<Profile | null> => {
    if (user) return Promise.resolve(user);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setVisible(true);
    });
  }, [user]);

  const close = useCallback((profile: Profile | null) => {
    setVisible(false);
    resolverRef.current?.(profile);
    resolverRef.current = null;
  }, []);

  return (
    <AuthGateContext.Provider value={{ requireAuth }}>
      {children}
      <AuthModal
        visible={visible}
        onClose={() => close(null)}
        onSuccess={(profile) => close(profile)}
      />
    </AuthGateContext.Provider>
  );
}

export function useAuthGate(): AuthGateContextValue {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error("useAuthGate must be used within AuthGateProvider");
  return ctx;
}
