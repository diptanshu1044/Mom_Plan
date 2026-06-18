export const queryKeys = {
  userProfile: ["user-profile"] as const,
  notifications: ["notifications"] as const,
  programs: (
    state: string,
    level: string,
    category: string,
    search: string,
    page: number
  ) => ["programs", state, level, category, search, page] as const,
  documentsChecklist: (
    state: string,
    level: string,
    search: string,
    page: number
  ) => ["documents-checklist", state, level, search, page] as const,
};
