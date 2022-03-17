export const isAdmin = (user) => user.role === "admin";

export const isPremium = (user) =>
  user.role === "admin" || user.role === "premium";
