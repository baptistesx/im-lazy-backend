"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    queryInterface.renameColumn("Users", "goodleId", "googleId");
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  },

  async down(queryInterface, Sequelize) {
    queryInterface.renameColumn("Users", "googleId", "goodleId");

    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  },
};
