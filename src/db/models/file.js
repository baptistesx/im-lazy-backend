"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class File extends Model {
    /**0
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      File.belongsTo(models.User, {
        foreignKey: "userId",
      });
    }
  }
  File.init(
    {
      name:DataTypes.STRING,
      content: DataTypes.JSONB,
    },
    {
      sequelize,
      modelName: "File",
    }
  );
  return File;
};
