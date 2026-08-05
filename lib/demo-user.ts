import type { Models } from "react-native-appwrite";

export function getDemoUser(): Models.User<{ city?: string }> {
  const t = new Date(0).toISOString();
  return {
    $id: "demo-user",
    $createdAt: t,
    $updatedAt: t,
    name: "Demo Student",
    registration: t,
    status: true,
    labels: [],
    passwordUpdate: t,
    email: "demo@nearbook.app",
    phone: "",
    emailVerification: true,
    phoneVerification: false,
    mfa: false,
    prefs: { city: "Patna" },
    targets: [],
    accessedAt: t,
  };
}
