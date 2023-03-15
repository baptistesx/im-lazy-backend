require("dotenv").config();

import { Application } from "express";
import { PassportStatic } from "passport";
import sequelize from "./db/models";
import initRoutes from "./routes";
import initPassportService from "./services/passport";
import initVariousMiddlewares from "./services/variousMiddlewares";
import { initBotSocket } from "./workawayBot/workawayBot";

const express = require("express");

// PassportJs is used for auth middlewares and actions
const passport: PassportStatic = require("passport");

const app: Application = express();

const server = require("http").createServer(app);

// Sockets for the Workaway bot live logs
export const io = require("socket.io")(server, {
  // TODO: change "*" to secure app
  cors: { origin: "*" },
});

// Sync all defined models to the DB.
sequelize
  .sync()
  .then(() => {
    io.sockets.on("connection", initBotSocket);

    initPassportService(passport);

    initVariousMiddlewares(app);

    initRoutes(app, passport);

    server.listen(process.env.PORT, () =>
      console.log(
        `Server running on ${process.env.API_URL}:${process.env.PORT}`
      )
    );
  })
  .catch((e) => {
    console.log("An error occured while models/db sync:", e);
  });
