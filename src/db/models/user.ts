"use strict";
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    id: { type: DataTypes.NUMBER, primaryKey: true },
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    googleId: DataTypes.STRING,
    provider: DataTypes.STRING,
    isAdmin: DataTypes.STRING,
    isPremium: DataTypes.STRING,
  });
  User.associate = function (models) {
    // associations can be defined here
  };

  return User;
};
