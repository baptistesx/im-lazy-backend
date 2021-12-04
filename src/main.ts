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
const startBot = require("./functions").startBot;
const initSocket = require("./functions").initSocket;

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors());

// parse application/json
app.use(bodyParser.json());

// Routes
app.post("/startBot", startBot);

// Init socket
io.sockets.on("connection", initSocket);

server.listen(4999);
