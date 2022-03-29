import AuthController from "../controllers/AuthController";
// Workaway bot callbacks
const startBot = require("../workawayBot/index").startBot;
const clearLogs = require("../workawayBot/index").clearLogs;
const stopBot = require("../workawayBot/index").stopBot;
const setCity = require("../workawayBot/index").setCity;
const getFilesName = require("../workawayBot/index").getFilesName;
const getFile = require("../workawayBot/index").getFile;
const deleteFile = require("../workawayBot/index").deleteFile;
const initSocket = require("../workawayBot/index").initSocket;

// Users callbacks
const getUser = require("../user/index").getUser;
const resetPassword = require("../user/index").resetPassword;
const getUsers = require("../user/index").getUsers;
const updateUserById = require("../user/index").updateUserById;
const updateUserPasswordById = require("../user/index").updateUserPasswordById;
const createUser = require("../user/index").createUser;
const deleteUserById = require("../user/index").deleteUserById;
const sendVerificationEmail = require("../user/index").sendVerificationEmail;
const savePayment = require("../user/index").savePayment;

module.exports = (app, passport) => {
  // Workaway Bot Routes
  app.post(
    "/workaway-bot/start-bot",
    [AuthController.isLoggedIn, AuthController.isPremium],
    startBot
  );
  app.get(
    "/workaway-bot/stop-bot",
    [AuthController.isLoggedIn, AuthController.isPremium],
    stopBot
  );
  app.get(
    "/workaway-bot/clear-logs",
    [AuthController.isLoggedIn, AuthController.isPremium],
    clearLogs
  );
  app.post(
    "/workaway-bot/set-city",
    [AuthController.isLoggedIn, AuthController.isPremium],
    setCity
  );
  app.get(
    "/workaway-bot/files-name",
    [AuthController.isLoggedIn, AuthController.isPremium],
    getFilesName
  );
  app.get(
    "/workaway-bot/file/:name",
    [AuthController.isLoggedIn, AuthController.isPremium],
    getFile
  );
  app.delete(
    "/workaway-bot/file/:name",
    [AuthController.isLoggedIn, AuthController.isPremium],
    deleteFile
  );

  // Users Routes
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
