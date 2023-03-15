import { Application } from "express";
import { PassportStatic } from "passport";
import initUsersRoutes from "./users";
import initWorkawayBotRoutes from "./workawayBot";

const initRoutes = (app: Application, passport: PassportStatic): void => {
  initWorkawayBotRoutes(app);

  initUsersRoutes(app, passport);
};

export default initRoutes;
