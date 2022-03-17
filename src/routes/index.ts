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
const createUser = require("../user/index").createUser;
const deleteUserById = require("../user/index").deleteUserById;

module.exports = (app, passport) => {
  // Workaway Bot Routes
  app.post(
    "/startBot",
    [AuthController.isLoggedIn, AuthController.isPremium],
    startBot
  );
  app.get(
    "/stopBot",
    [AuthController.isLoggedIn, AuthController.isPremium],
    stopBot
  );
  app.get(
    "/clearLogs",
    [AuthController.isLoggedIn, AuthController.isPremium],
    clearLogs
  );
  app.post(
    "/setCity",
    [AuthController.isLoggedIn, AuthController.isPremium],
    setCity
  );
  app.get(
    "/filesName",
    [AuthController.isLoggedIn, AuthController.isPremium],
    getFilesName
  );
  app.get(
    "/file/:name",
    [AuthController.isLoggedIn, AuthController.isPremium],
    getFile
  );
  app.delete(
    "/file/:name",
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
    "/users",
    [AuthController.isLoggedIn, AuthController.isAdmin],
    getUsers
  );

  app.delete(
    "/user/:id",
    [AuthController.isLoggedIn, AuthController.isAdmin],
    deleteUserById
  );

  app.get("/user", AuthController.isLoggedIn, getUser);

  app.post(
    "/signInWithGoogle",
    passport.authenticate("google-token", { session: false }),
    AuthController.signIn
  );

  app.post(
    "/signInWithEmailAndPassword",
    passport.authenticate("local-signin", { session: false }),
    AuthController.signIn
  );

  app.post(
    "/signUp",
    passport.authenticate("local-signup", { session: false }),
    AuthController.signIn
  );

  app.post("/resetPassword", AuthController.userExists, resetPassword);

  app.post("/signOut", AuthController.signOut);
};
