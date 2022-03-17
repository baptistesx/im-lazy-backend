export const isAdmin = (user) => user.role === "admin";

export const isPremium = (user) =>
  user.role === "admin" || user.role === "premium";

export function capitalizeFirstLetter(string: string | undefined) {
  if (string === undefined) {
    return "";
  }

  return string.charAt(0).toUpperCase() + string.slice(1);
}
