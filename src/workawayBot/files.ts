import { Request, Response } from "express";
import { File as WorkawayFile } from "../db/models/File";
import { getCurrentDateTime } from "./utils";
import { logAndEmitToRoom } from "./workawayBot";

export const getFilesInfo = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { uuser: user } = req;

  if (user === undefined) {
    res.status(401).send("user is undefined");

    return;
  }

  const files = await WorkawayFile.findAll({
    where: { userId: user.id },
  });

  res.send({ files });
};

export const deleteFile = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { uuser: user, params } = req;

  if (user === undefined) {
    res.status(401).send("user is undefined");

    return;
  }

  const file = await WorkawayFile.findOne({
    where: { userId: user.id, id: params.id },
  });

  if (file === null) {
    res.status(500).send("file not found");

    return;
  }

  file.destroy();

  await logAndEmitToRoom({
    userId: user.id,
    logString: `${getCurrentDateTime()} ➤ FILE WELL DELETED`,
  });

  res.send("ok");
};

export const getFile = async (req: Request, res: Response): Promise<void> => {
  const { uuser: user, params } = req;

  if (user === undefined) {
    res.status(401).send("user is undefined");

    return;
  }

  const file = await WorkawayFile.findOne({
    where: { userId: user.id, id: params.id },
  });

  if (file === null) {
    res.status(500).send("file not found");

    return;
  }

  res.json({ file });
};
