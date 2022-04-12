import { Request, Response } from "express";
import { Payment } from "../db/models/Payment";
import { RolesEnum, User } from "../db/models/User";
import {
  sendResetPasswordMail,
  sendWelcomeCreatedByAdminMail,
  sendWelcomeMail,
} from "../services/mails";

// To generate uuids
const { v4: uuidV4 } = require("uuid");

// To encrypt and verify passwords
const bcrypt = require("bcrypt");
const saltRounds = 10;

// TODO: type Reponse

export const getUser = (req: Request, res: Response): void => {
  const { uuser: user } = req;

  res.send({ user });
};

export const resetPassword = (req: Request, res: Response): void => {
  const { uuser: user } = req;

  if (user) {
    const randomPassword = Math.random().toString(36).slice(-8);

    bcrypt.hash(
      randomPassword,
      saltRounds,
      async function (_err: Error, password: string) {
        try {
          user.password = password;

          await user.save();

          sendResetPasswordMail({
            email: user.email,
            name: user.name,
            randomPassword,
          });

          res.status(200).send();
        } catch (err) {
          res.status(500).send();
        }
      }
    );
  } else {
    // Don't send an error to not inform a potential hacker the user doesn't exist
    // The frontend will display a message like "if user exists, a reset password email has been sent"
    res.status(200).send();
  }
};

export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  const users = await User.findAll();

  if (users) {
    res.status(200).send({ users });
  } else {
    res.status(400).send("error getting users");
  }
};

export const deleteUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const id = req.params.id;
  console.log(id);
  const userToDelete = await User.findOne({ where: { id } });
  console.log(userToDelete);
  if (userToDelete === null) {
    res.status(400).send("no user to delete");

    return;
  }

  userToDelete.destroy();

  res.send("ok");
};

export const updateUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email, name, role } = req.body;
  const { uuser: user } = req;

  if (user === undefined) {
    res.status(400).send("user is undefined");

    return;
  }
  if (email === undefined) {
    res.status(400).send("email is undefined");

    return;
  }
  if (name === undefined) {
    res.status(400).send("name is undefined");

    return;
  }
  if (role !== undefined) {
    user.role =
      role === "admin"
        ? RolesEnum.ADMIN
        : role === "premium"
        ? RolesEnum.PREMIUM
        : RolesEnum.CLASSIC;
  }

  user.email = email;
  user.name = name;

  await user.save();

  res.status(200).send();
};

export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email, name, role: tempRole } = req.body;

  if (email === undefined) {
    res.status(400).send("email is undefined");

    return;
  }
  if (name === undefined) {
    res.status(400).send("name is undefined");

    return;
  }
  if (tempRole === undefined) {
    res.status(400).send("role is undefined");

    return;
  }

  const role =
    tempRole === "admin"
      ? RolesEnum.ADMIN
      : tempRole === "premium"
      ? RolesEnum.PREMIUM
      : RolesEnum.CLASSIC;

  const randomPassword = Math.random().toString(36).slice(-8);

  bcrypt.hash(
    randomPassword,
    saltRounds,
    async function (_err: Error, password: string) {
      const emailVerificationString = uuidV4();

      try {
        await User.create({
          email,
          name,
          password,
          role,
          emailVerificationString,
        });

        const finalEmail = process.env.EMAIL_TEST ?? email ?? "";

        if (finalEmail === "") {
          throw new Error("email is undefined");
        }

        sendWelcomeCreatedByAdminMail({
          email: finalEmail,
          name,
          verificationString: emailVerificationString,
          randomPassword,
        });

        res.status(200).send();
      } catch (err) {
        res.status(500).send();
      }
    }
  );
};

export const updateUserPasswordById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { uuser: user } = req;

  if (user === undefined) {
    res.status(401).send("user is undefined");

    return;
  }

  bcrypt.compare(
    req.body.currentPassword,
    user.password,
    function (_err: Error, isMatch: boolean) {
      if (!isMatch) {
        res.status(400).send("Incorrect password");

        return;
      }

      bcrypt.hash(
        req.body.newPassword,
        saltRounds,
        async function (_err: Error, password: string) {
          user.password = password;

          user.save();

          res.status(200).send();
        }
      );
    }
  );
};

export const sendVerificationEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email, name } = req.body;

  if (email === undefined) {
    res.send(400).send("email is undefined");

    return;
  }

  const emailVerificationString = uuidV4();

  try {
    const user = await User.findOne({ where: { email } });

    if (user === null) {
      res.send(400).send("user is undefined");

      return;
    }

    user.emailVerificationString = emailVerificationString;

    user.save();

    const finalEmail = process.env.EMAIL_TEST ?? email ?? "";

    if (finalEmail === "") {
      throw new Error("email is undefined");
    }

    sendWelcomeMail({
      email: finalEmail,
      name,
      verificationString: emailVerificationString,
    });

    res.status(200).send();
  } catch (err) {
    res.status(500).send();
  }
};

export const savePayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { uuser: user } = req;

  if (user === undefined) {
    res.status(401).send("user is undefined");

    return;
  }

  await Payment.create({
    userId: user.id,
    details: req.body.paymentResume,
  });

  user.role = RolesEnum.PREMIUM;

  user.save();

  try {
    res.status(200).send();
  } catch (err) {
    res.status(500).send();
  }
};
