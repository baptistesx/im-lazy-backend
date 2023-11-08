"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Users", "isAdmin");
    await queryInterface.removeColumn("Users", "isPremium");
    await queryInterface.addColumn("Users", "role", {
      defaultValue: "classic",
      allowNull: false,
      type: Sequelize.ENUM("admin", "premium", "classic"),
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Users", "role");
    await queryInterface.addColumn("Users", "isAdmin", {
      defaultValue: false,
      allowNull: false,
      type: Sequelize.BOOLEAN,
    });
    await queryInterface.addColumn("Users", "isPremium", {
      defaultValue: false,
      allowNull: false,
      type: Sequelize.BOOLEAN,
    });
  },
};
