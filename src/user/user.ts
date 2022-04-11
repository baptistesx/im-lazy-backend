import { Request, Response } from "express";
import { RolesEnum, User } from "../db/models/User";
import { sendMail } from "../services/mails";
import { capitalizeFirstLetter } from "../utils/functions";
// const User = require("../utils/functions")
const Payment = require("../db/models").Payment;
// To generate uuids
const { v4: uuidV4 } = require("uuid");

// To encrypt and verify passwords
const bcrypt = require("bcrypt");
const saltRounds = 10;

// export interface Address {
//   /**
//    * The first line of the address. For example, number or street.
//    * @maxLength 300
//    */
//   address_line_1?: string;
//   /**
//    * The second line of the address. For example, suite or apartment number.
//    * @maxLength 300
//    */
//   address_line_2?: string;
//   /** The highest level sub-division in a country, which is usually a province, state, or ISO-3166-2 subdivision. */
//   admin_area_1?: string;
//   /** A city, town, or village. Smaller than `admin_area_level_1`. */
//   admin_area_2?: string;
//   /**
//    * The postal code, which is the zip code or equivalent.
//    * Typically required for countries with a postal code or an equivalent.
//    */
//   postal_code?: string;
//   /** The [two-character ISO 3166-1 code](/docs/integration/direct/rest/country-codes/) that identifies the country or region. */
//   country_code: string;
// }

// type PaymentResume = {
//   createTime: string | undefined;
//   updateTime: string | undefined;
//   payer: {
//     email: string | undefined;
//     name: string | undefined;
//     surname: string | undefined;
//     id: string | undefined;
//     address: Address | undefined;
//   };
//   amount: string | undefined;
//   currency: string | undefined;
//   status:
//     | "COMPLETED"
//     | "SAVED"
//     | "APPROVED"
//     | "VOIDED"
//     | "PAYER_ACTION_REQUIRED"
//     | undefined;
//   merchandEmail: string | undefined;
//   merchandId: string | undefined;
//   billingToken?: string | null | undefined;
//   facilitatorAccessToken: string;
//   orderID: string;
//   payerID?: string | null | undefined;
//   paymentID?: string | null | undefined;
//   subscriptionID?: string | null | undefined;
//   authCode?: string | null | undefined;
// };

// interface CustomParamsDictionary extends core.ParamsDictionary {
//   id?: string;
// }

// // Declaring custom request interface
// declare namespace Express {
//   export interface Request {
//     user?: User;
//     params: CustomParamsDictionary;
//     body: {
//       id: number;
//       name?: string;
//       email?: string;
//       role?: "admin" | "classic" | "premium";
//       paymentResume?: PaymentResume;
//       currentPassword?: string;
//       newPassword?: string;
//       headless?: boolean;
//       developmentMode?: boolean;
//       password?: string;
//       city?: string;
//       detectionRadius?: number;
//       messageSubject?: string;
//       englishMessage?: string;
//       frenchMessage?: string;
//       minimumAge?: number;
//       maximumAge?: number;
//     };
//     cookies: { token?: string };
//   }
// }
// export interface Request extends Request {
//   user?: User;
//   params: CustomParamsDictionary;
//   body: {
//     id: number;
//     name?: string;
//     email?: string;
//     role?: "admin" | "classic" | "premium";
//     paymentResume?: PaymentResume;
//     currentPassword?: string;
//     newPassword?: string;
//     headless?: boolean;
//     developmentMode?: boolean;
//     password?: string;
//     city?: string;
//     detectionRadius?: number;
//     messageSubject?: string;
//     englishMessage?: string;
//     frenchMessage?: string;
//     minimumAge?: number;
//     maximumAge?: number;
//   };
//   cookies: { token?: string };
// }

// TODO: type Reponse

export const getUser = (req: Request, res: Response): void => {
  req.body;
  res.status(200).send({ user: req?.user });
};

export const resetPassword = (req: Request, res: Response): void => {
  const user = req.uuser;
  if (user) {
    const randomPassword = Math.random().toString(36).slice(-8);

    bcrypt.hash(
      randomPassword,
      saltRounds,
      async function (_err: Error, password: string) {
        try {
          user.password = password;

          await user.save();

          sendMail({
            from: "ImLazy app",
            to: process.env.EMAIL_TEST ?? user.email,
            subject: "Welcome to ImLazy app!",
            html: `<p>Hi ${capitalizeFirstLetter(req.body.name)},</p>
          <p>Here is your new password (don't hesisate to change it on your profile page): ${randomPassword}</p>
          <p>Enjoy</p>
          <p>The ImLazy Team</p>`,
          });

          res.status(200).send();
        } catch (err) {
          res.status(500).send();
        }
      }
    );
  } else {
    res.status(500).send();
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
  if (id === undefined) {
    throw new Error("id is null");
  }
  const userToDelete = await User.findOne({ where: { id } });

  if (userToDelete) {
    userToDelete.destroy();
    res.status(200).send();
  } else {
    res.status(400).send("no user to delete");
  }
};

export const updateUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const email = req.body.email;
  const name = req.body.name;
  const role = req.body.role;

  const user = req.uuser;
  if (user === undefined) {
    throw new Error("user is undefined");
  }
  if (email === undefined) {
    throw new Error("user is undefined");
  }
  if (name === undefined) {
    throw new Error("user is undefined");
  }
  if (role === undefined) {
    throw new Error("user is undefined");
  }

  user.email = email;
  user.name = name;
  user.role =
    role === "admin"
      ? RolesEnum.ADMIN
      : role === "premium"
      ? RolesEnum.PREMIUM
      : RolesEnum.CLASSIC;

  await user.save();

  res.status(200).send();
};

export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const email = req.body.email;
  const name = req.body.name;
  const tempRole = req.body.role;
  if (tempRole === undefined) {
    throw new Error("role is undefined");
  }
  if (email === undefined) {
    throw new Error("email is undefined");
  }
  if (name === undefined) {
    throw new Error("name is undefined");
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
          // if (process.env.EMAIL_TEST === undefined && email === undefined) {
          throw new Error("email is undefined");
        }
        sendMail({
          from: "ImLazy app",
          to: finalEmail,
          subject: "Welcome to ImLazy app!",
          html: `<p>Welcome ${capitalizeFirstLetter(
            req.body.name
          )} on ImLazy app !</p>
          <p>You'll discover all the lazy ressources available !</p>
          <p>Last step to verify your account, press <a href="${
            process.env.API_URL
          }/verify/${emailVerificationString}">Here</a></p>
          <p>Enjoy</p>
          <p>The ImLazy Team</p>`,
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
  const user = req.uuser;
  if (user === undefined) {
    throw new Error("user is undefined");
  }
  bcrypt.compare(
    req.body.currentPassword,
    user.password,
    function (_err: Error, isMatch: boolean) {
      if (!isMatch) {
        res.status(400).send();
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
  const email = req.body.email;
  if (email === undefined) {
    throw new Error("email is undefined");
  }
  const emailVerificationString = uuidV4();

  try {
    const user = await User.findOne({ where: { email } });

    if (user === null) {
      throw new Error("email is undefined");
    }
    user.emailVerificationString = emailVerificationString;
    user.save();

    const finalEmail = process.env.EMAIL_TEST ?? email ?? "";
    if (finalEmail === "") {
      // if (process.env.EMAIL_TEST === undefined && email === undefined) {
      throw new Error("email is undefined");
    }
    sendMail({
      from: "ImLazy app",
      to: finalEmail,
      subject: "Welcome to ImLazy app!",
      html: `<p>Welcome ${capitalizeFirstLetter(
        req.body.name
      )} on ImLazy app !</p>
        <p>You'll discover all the lazy ressources available !</p>
        <p>Last step to verify your account, press <a href="${
          process.env.API_URL
        }/verify/${emailVerificationString}">Here</a></p>
        <p>Enjoy</p>
        <p>The ImLazy Team</p>`,
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
  const user = req.uuser;
  if (user === undefined) {
    throw new Error("user is undefined");
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
