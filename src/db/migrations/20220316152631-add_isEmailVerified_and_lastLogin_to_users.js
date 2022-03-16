"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "isEmailVerified", {
      defaultValue: false,
      allowNull: false,
      type: Sequelize.BOOLEAN,
    });

    await queryInterface.addColumn("Users", "lastLogin", {
      type: Sequelize.DATE,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Users", "isEmailVerified");
    await queryInterface.removeColumn("Users", "lastLogin");
  },
};
