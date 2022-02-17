// user/index.ts
var user = require("./user");

module.exports = {
  signup: user.signup,
  signin: user.signin,
  getUsers: user.getUsers,
  toggleAdminRights: user.toggleAdminRights,
  deleteUserById: user.deleteUserById,
  getCompanies: user.getCompanies,
  updateUserById: user.updateUserById,
  createUser: user.createUser,
};
