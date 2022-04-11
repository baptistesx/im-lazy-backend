require("dotenv").config();

import { Application } from "express";
import { PassportStatic } from "passport";
import sequelize from "./db/models";

const cors = require("cors");
const logger = require("morgan");
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const routes = require("./routes/index");

// PassportJs is used for auth middlewares and actions
const passport: PassportStatic = require("passport");
// const passportService = require(`${__dirname}/services/passport`)(passport); // pass passport for configuration
const app: Application = express();

const server = require("http").createServer(app);
// Sockets for the Workaway bot live logs
export const io = require("socket.io")(server, {
  // TODO: change "*" to secure app
  cors: { origin: "*" },
});
const initSocket = require("./workawayBot/index").initSocket;
sequelize.sync().then(() => {
  // Init socket
  io.sockets.on("connection", initSocket);

  require(`${__dirname}/services/passport`)(passport); // pass passport for configuration
  const corsOptions = {
    credentials: true,
    origin:
      process.env.NODE_ENV !== "production" ? true : process.env.ALLOWED_DOMAIN,
  };
  app.use(cors(corsOptions));

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(logger("dev"));
  app.set("trust proxy", 1);
  routes.init(app, passport);

  const port = process.env.PORT || 3100;
  server.listen(port, () =>
    console.log(`Server running on http://localhost:${port}`)
  );
});
