import { Application } from "express";
const cors = require("cors");
const logger = require("morgan");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

export default (app: Application): void => {
  const corsOptions = {
    credentials: true,
    origin:
      process.env.NODE_ENV === "production" ? process.env.ALLOWED_DOMAIN : true,
  };

  app.use(cors(corsOptions));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(logger("dev"));

  // TODO: check if still needed
  app.set("trust proxy", 1);
};
