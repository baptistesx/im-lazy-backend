// workaway/index.ts
const workawayBot = require("./workawayBot");

module.exports = {
  initSocket: workawayBot.initSocket,
  startBot: workawayBot.startBot,
  clearLogs: workawayBot.clearLogs,
  stopBot: workawayBot.stopBot,
  setCity: workawayBot.setCity,
  getFilesInfo: workawayBot.getFilesInfo,
  deleteFile: workawayBot.deleteFile,
  getFile: workawayBot.getFile,
};
