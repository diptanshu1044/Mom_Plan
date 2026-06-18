import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AuthUser } from "@/store/auth.store";

export function useUserProfile(enabled = true) {
  return useQuery<AuthUser>({
    queryKey: queryKeys.userProfile,
    queryFn: async () => {
      const res = await api.get("/api/user/profile");
      return res.data.data;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
