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
  updateUserPasswordById: user.updateUserPasswordById,
  sendVerificationEmail: user.sendVerificationEmail,
  savePayment: user.savePayment,
};
