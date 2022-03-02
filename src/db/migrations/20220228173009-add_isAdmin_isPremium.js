"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    queryInterface.addColumn("Users", "isAdmin", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    queryInterface.addColumn("Users", "isPremium", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });

    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  },

  async down(queryInterface, Sequelize) {
    queryInterface.removeColumn("Users", "isAdmin");
    queryInterface.removeColumn("Users", "isPremium");
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  },
};
