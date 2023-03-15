"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addConstraint("Users", {
      type: "UNIQUE",
      fields: ["email"],
      name: "unique_user_email",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint("app_users", "unique_user_email");
  },
};
