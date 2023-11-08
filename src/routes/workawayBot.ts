import { Application } from "express";
import AuthController from "../controllers/AuthController";
import { deleteFile, getFile, getFilesInfo } from "../workawayBot/files";
import {
  clearLogs,
  setCity,
  startBot,
  stopBot,
} from "../workawayBot/workawayBot";

export default (app: Application): void => {
  app.post(
    "/workaway-bot/start-bot",
    [AuthController.isLoggedIn, AuthController.isPremium],
    startBot
  );

  app.get(
    "/workaway-bot/stop-bot",
    [AuthController.isLoggedIn, AuthController.isPremium],
    stopBot
  );

  app.get(
    "/workaway-bot/clear-logs",
    [AuthController.isLoggedIn, AuthController.isPremium],
    clearLogs
  );

  app.post(
    "/workaway-bot/set-city",
    [AuthController.isLoggedIn, AuthController.isPremium],
    setCity
  );

  app.get(
    "/workaway-bot/files-info",
    [AuthController.isLoggedIn, AuthController.isPremium],
    getFilesInfo
  );

  app.get(
    "/workaway-bot/file/:id",
    [AuthController.isLoggedIn, AuthController.isPremium],
    getFile
  );

  app.delete(
    "/workaway-bot/file/:id",
    [AuthController.isLoggedIn, AuthController.isPremium],
    deleteFile
  );
};
