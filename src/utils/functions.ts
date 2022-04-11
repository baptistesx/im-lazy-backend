// export type Users = {
//   name: string;
//   email: string;
//   password: string;
//   googleId: string;
//   provider: string;
//   role: "admin" | "premium" | "classic";
//   isEmailVerified: boolean;
//   lastLogin: Date;
//   emailVerificationString: string;
// };

import { User } from "../db/models/User";

export const isAdmin = (user: User): boolean => user.role === "admin";

export const isPremium = (user: User): boolean =>
  user.role === "admin" || user.role === "premium";

export const capitalizeFirstLetter = (string: string | undefined): string => {
  if (string === undefined) {
    return "";
  }

  return string.charAt(0).toUpperCase() + string.slice(1);
};
