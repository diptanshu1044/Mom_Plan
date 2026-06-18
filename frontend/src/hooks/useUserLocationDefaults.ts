import { useMemo } from "react";
import { useAuthStore } from "@/store/auth.store";

export interface UserLocationDefaults {
  state: string;
  city: string;
  zip_code: string;
  county: string;
}

export function getUserLocationDefaults(
  user: ReturnType<typeof useAuthStore.getState>["user"]
): UserLocationDefaults {
  return {
    state: user?.state || user?.family_profile?.state || "",
    city: user?.city || user?.family_profile?.city || "",
    zip_code: user?.zip_code || user?.family_profile?.zip_code || "",
    county: user?.county || user?.family_profile?.county || "",
  };
}

export function useUserLocationDefaults(): UserLocationDefaults {
  const user = useAuthStore((state) => state.user);
  return useMemo(() => getUserLocationDefaults(user), [user]);
}
