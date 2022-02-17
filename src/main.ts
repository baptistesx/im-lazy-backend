// Allow to use .env variables
require("dotenv").config();

var express = require("express");
var app = express();
var server = require("http").createServer(app);

// Sockets for the bot live logs
var io = (exports.io = require("socket.io")(server, {
  // TODO: change "*" to secure app
  cors: { origin: "*" },
}));

const bodyParser = require("body-parser");

var cors = require("cors");

// Workaway bot callbacks
const startBot = require("./workawayBot/index").startBot;
const clearLogs = require("./workawayBot/index").clearLogs;
const stopBot = require("./workawayBot/index").stopBot;
const setCity = require("./workawayBot/index").setCity;
const getFilesName = require("./workawayBot/index").getFilesName;
const getFile = require("./workawayBot/index").getFile;
const deleteFile = require("./workawayBot/index").deleteFile;
const initSocket = require("./workawayBot/index").initSocket;

// Users callbacks
const signup = require("./user/index").signup;
const signin = require("./user/index").signin;
const getUsers = require("./user/index").getUsers;
const updateUserById = require("./user/index").updateUserById;
const createUser = require("./user/index").createUser;
const getCompanies = require("./user/index").getCompanies;
const toggleAdminRights = require("./user/index").toggleAdminRights;
const deleteUserById = require("./user/index").deleteUserById;

// Auth middlewares
const isAdmin = require("./middleware/auth").isAdmin;
const isAuthenticated = require("./middleware/auth").isAuthenticated;

// Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// Parse application/json
app.use(bodyParser.json());

app.use(cors());

// Workaway Bot Routes
app.post("/startBot", startBot);
app.get("/stopBot", stopBot);
app.get("/clearLogs", clearLogs);
app.post("/setCity", setCity);
app.get("/filesName", getFilesName);
app.get("/file", getFile);
app.delete("/file", deleteFile);

// Users Routes
app.post("/signup", signup);
app.post("/signin", signin);
app.put("/user", isAdmin, updateUserById);
app.post("/user", isAdmin, createUser);
app.get("/users", isAdmin, getUsers);
app.get("/companies", isAdmin, getCompanies);
app.put("/toggleAdminRights", isAdmin, toggleAdminRights);
app.delete("/user/:id", isAdmin, deleteUserById);

// Init socket
io.sockets.on("connection", initSocket);

server.listen(process.env.PORT);
