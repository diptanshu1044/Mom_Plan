export type UserNameParts = {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
};

export function formatUserName(user: UserNameParts | null | undefined): string {
  if (!user) return "";
  return [user.first_name, user.middle_name, user.last_name]
    .filter((part) => part?.trim())
    .join(" ");
}

export function userInitials(user: UserNameParts | null | undefined): string {
  const first = user?.first_name?.trim();
  const last = user?.last_name?.trim();
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) return first[0].toUpperCase();
  if (last) return last[0].toUpperCase();
  return "";
}

export function userFirstName(user: UserNameParts | null | undefined): string {
  return user?.first_name?.trim() || "";
}
