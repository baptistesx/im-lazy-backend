"use strict";

import { Sequelize } from "sequelize-typescript";
import { File } from "./File";
import { Payment } from "./Payment";
import { User } from "./User";
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config.ts")[env];

const sequelize = new Sequelize(
  "im-lazy-development",
  // process.env[config.use_env_variable]!,
  config.username,
  config.password,
  config
);

sequelize.addModels([User, File, Payment]);

export default sequelize;
