require("dotenv").config();

var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = (exports.io = require("socket.io")(server, {
  cors: { origin: "*" },
}));

const bodyParser = require("body-parser");
var cors = require("cors");

// Functions
const startBot = require("./functions/workaway-bot-functions").startBot;
const clearLogs = require("./functions/workaway-bot-functions").clearLogs;
const stopBot = require("./functions/workaway-bot-functions").stopBot;
const setCity = require("./functions/workaway-bot-functions").setCity;
const getFilesName = require("./functions/workaway-bot-functions").getFilesName;
const getFile = require("./functions/workaway-bot-functions").getFile;
const deleteFile = require("./functions/workaway-bot-functions").deleteFile;
const initSocket = require("./functions/workaway-bot-functions").initSocket;
const signup = require("./functions/user-functions").signup;
const signin = require("./functions/user-functions").signin;
const getUsers = require("./functions/user-functions").getUsers;
const toggleAdminRights = require("./functions/user-functions").toggleAdminRights;
const deleteUserById = require("./functions/user-functions").deleteUserById;
const isAdmin = require("./middleware/auth").isAdmin;
const isAuthenticated = require("./middleware/auth").isAuthenticated;

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors());

// parse application/json
app.use(bodyParser.json());

// Workaway Bot Routes
app.post("/startBot", startBot);
app.get("/clearLogs", clearLogs);
app.get("/stopBot", stopBot);
app.post("/setCity", setCity);
app.get("/filesName", getFilesName);
app.get("/file", getFile);
app.delete("/file", deleteFile);

// Users Routes
app.post("/signup", signup);
app.post("/signin", signin);
app.get("/users", isAdmin, getUsers);
app.put("/toggleAdminRights", isAdmin, toggleAdminRights);
app.delete("/deleteUserById/:id", isAdmin, deleteUserById);

// Init socket
io.sockets.on("connection", initSocket);

server.listen(process.env.PORT);
