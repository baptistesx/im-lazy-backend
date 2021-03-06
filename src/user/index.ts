import { getUser } from "./user";
// user/index.ts
var user = require("./user");

module.exports = {
  getUser: user.getUser,
  resetPassword: user.resetPassword,
  getUsers: user.getUsers,
  deleteUserById: user.deleteUserById,
  getCompanies: user.getCompanies,
  updateUserById: user.updateUserById,
  createUser: user.createUser,
};
