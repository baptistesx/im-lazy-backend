"use strict";

// import path from "path";
import { Sequelize } from "sequelize-typescript";
import configs from "../config";
import { File } from "./File";
import { Payment } from "./Payment";
import { User } from "./User";

const env = process.env.NODE_ENV || "development";

const config = configs[env];

const sequelize = new Sequelize(process.env[config.use_env_variable], config);

sequelize.addModels([User, File, Payment]);

export default sequelize;
