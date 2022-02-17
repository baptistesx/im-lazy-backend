// workaway/index.ts
var workawayBot = require("./workawayBot");
var utils = require("./utils");

module.exports = {
  initSocket: workawayBot.initSocket,
  startBot: workawayBot.startBot,
  clearLogs: workawayBot.clearLogs,
  stopBot: workawayBot.stopBot,
  setCity: workawayBot.setCity,
  getFilesName: workawayBot.getFilesName,
  deleteFile: workawayBot.deleteFile,
  getFile: workawayBot.getFile,
};
