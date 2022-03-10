"use strict";

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
console.log("ENVIRONMENT***********: ", env);
var root = require("path").dirname(require.main.filename);
const customConfig = require(path.join(path.join(root, "/../src/db/config")))[
  env
];

const db: { sequelize: any; Sequelize: any } = {
  sequelize: undefined,
  Sequelize: undefined,
};

let sequelize;

if (customConfig.use_env_variable) {
  console.log("IN IF ***********");
  console.log(process.env[customConfig.use_env_variable]);
  console.log(customConfig);
  sequelize = new Sequelize(
    process.env[customConfig.use_env_variable],
    customConfig
  );
} else {
  console.log("IN ELSE ********");
  sequelize = new Sequelize(
    customConfig.database,
    customConfig.username,
    customConfig.password,
    customConfig
  );
}
console.log("AFFTTTER SETUP SEQUELIZE ***");
fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 && file !== basename && file.slice(-3) === ".js"
    );
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(
      sequelize,
      Sequelize.DataTypes
    );
    db[model.name] = model;
  });
console.log("TTTEST1d");
Object.keys(db).forEach((modelName) => {
  if (db[modelName]?.associate) {
    db[modelName]?.associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

console.log("TTTTTEST222");
module.exports = {
  db: db,
  User: require("./user")(sequelize, Sequelize.DataTypes),
};
