import { Application } from "express";
import { PassportStatic } from "passport";
import AuthController from "../controllers/AuthController";
import {
  createUser,
  deleteUserById,
  getUser,
  getUsers,
  resetPassword,
  savePayment,
  sendVerificationEmail,
  updateUserById,
  updateUserPasswordById,
} from "../user/user";

export default (app: Application, passport: PassportStatic): void => {
  app.put(
    "/user",
    [AuthController.isLoggedIn, AuthController.isAdminOrCurrentUser],
    updateUserById
  );

  app.post(
    "/user",
    [AuthController.isLoggedIn, AuthController.isAdmin],
    createUser
  );

  app.get(
    "/user/users",
    [AuthController.isLoggedIn, AuthController.isAdmin],
    getUsers
  );

  app.delete(
    "/user/:id",
    [AuthController.isLoggedIn, AuthController.isAdmin],
    deleteUserById
  );

  app.get("/auth/user", AuthController.isLoggedIn, getUser);

  app.post(
    "/auth/sign-in-with-google",
    passport.authenticate("google-token", { session: false }),
    AuthController.signIn
  );

  app.post(
    "/auth/sign-in-with-email-and-password",
    passport.authenticate("local-signin", { session: false }),
    AuthController.signIn
  );

  app.post(
    "/auth/sign-up",
    passport.authenticate("local-signup", { session: false }),
    AuthController.signIn
  );

  app.post("/user/reset-password", AuthController.userExists, resetPassword);

  app.post("/auth/sign-out", AuthController.signOut);

  app.get("/verify/:emailVerificationString", AuthController.verifyEmail);

  app.put(
    "/user/:id/password",
    AuthController.isLoggedIn,
    updateUserPasswordById
  );

  app.post(
    "/user/send-verification-email",
    AuthController.userExists,
    sendVerificationEmail
  );

  app.post(
    "/user/save-payment",
    [AuthController.isLoggedIn, AuthController.isNotPremium],
    savePayment
  );
};
