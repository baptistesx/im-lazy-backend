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
const toggleAdminRights = require("../user/index").toggleAdminRights;
const deleteUserById = require("../user/index").deleteUserById;

module.exports = (app, passport) => {
  // Workaway Bot Routes
  app.post("/startBot", startBot);
  app.get("/stopBot", stopBot);
  app.get("/clearLogs", clearLogs);
  app.post("/setCity", setCity);
  app.get("/filesName", getFilesName);
  app.get("/file", getFile);
  app.delete("/file", deleteFile);

  // Users Routes
  app.put(
    "/user",
    [AuthController.isLoggedIn, AuthController.isAdmin],
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
  app.put(
    "/toggleAdminRights",
    [AuthController.isLoggedIn, AuthController.isAdmin],
    toggleAdminRights
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
