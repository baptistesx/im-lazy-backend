import { NextFunction, Request, Response } from "express";
import * as core from "express-serve-static-core";
import { User, User as Uuser } from "../db/models/User";
import { isAdmin, isPremium } from "../utils/functions";

export interface Address {
  /**
   * The first line of the address. For example, number or street.
   * @maxLength 300
   */
  address_line_1?: string;
  /**
   * The second line of the address. For example, suite or apartment number.
   * @maxLength 300
   */
  address_line_2?: string;
  /** The highest level sub-division in a country, which is usually a province, state, or ISO-3166-2 subdivision. */
  admin_area_1?: string;
  /** A city, town, or village. Smaller than `admin_area_level_1`. */
  admin_area_2?: string;
  /**
   * The postal code, which is the zip code or equivalent.
   * Typically required for countries with a postal code or an equivalent.
   */
  postal_code?: string;
  /** The [two-character ISO 3166-1 code](/docs/integration/direct/rest/country-codes/) that identifies the country or region. */
  country_code: string;
}

type PaymentResume = {
  createTime: string | undefined;
  updateTime: string | undefined;
  payer: {
    email: string | undefined;
    name: string | undefined;
    surname: string | undefined;
    id: string | undefined;
    address: Address | undefined;
  };
  amount: string | undefined;
  currency: string | undefined;
  status:
    | "COMPLETED"
    | "SAVED"
    | "APPROVED"
    | "VOIDED"
    | "PAYER_ACTION_REQUIRED"
    | undefined;
  merchandEmail: string | undefined;
  merchandId: string | undefined;
  billingToken?: string | null | undefined;
  facilitatorAccessToken: string;
  orderID: string;
  payerID?: string | null | undefined;
  paymentID?: string | null | undefined;
  subscriptionID?: string | null | undefined;
  authCode?: string | null | undefined;
};

interface CustomParamsDictionary extends core.ParamsDictionary {
  id?: string;
}

declare global {
  namespace Express {
    export interface Request {
      // TODO: rename uuser param
      uuser?: Uuser;
      params: CustomParamsDictionary;
      body: {
        id: number;
        name?: string;
        email?: string;
        role?: "admin" | "classic" | "premium";
        paymentResume?: PaymentResume;
        currentPassword?: string;
        newPassword?: string;
        headless?: boolean;
        developmentMode?: boolean;
        password?: string;
        city?: string;
        detectionRadius?: number;
        messageSubject?: string;
        englishMessage?: string;
        frenchMessage?: string;
        minimumAge?: number;
        maximumAge?: number;
      };
      cookies: { token?: string };
    }
  }
}

const jwt = require("jsonwebtoken");

const AuthController = {
  async signIn(req: Request, res: Response): Promise<void> {
    const { uuser: user } = req;

    if (user === undefined) {
      res.status(400).send({ error: "User was not authenticated" });
      return;
    }

    const token = jwt.sign(user.id, process.env.JWT_SECRET);

    res
      .status(200)
      .cookie("token", token, {
        secure: process.env.NODE_ENV !== "development",
        sameSite: "strict",
        expires: new Date(new Date().getTime() + 2 * 60 * 60 * 1000),
        httpOnly: true,
        domain: process.env.NODE_ENV === "production" ? "imlazy.app" : "", // TODO: use env var
      })
      .send({ user });

    user.lastLogin = new Date();

    await user.save();
  },

  async signOut(_req: Request, res: Response): Promise<void> {
    res.clearCookie("token", {
      domain: process.env.NODE_ENV === "production" ? "imlazy.app" : "",
    });

    res.status(200).send({ user: {} });
  },
  async isLoggedIn(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const token = req.cookies.token;

    if (!token) {
      res.clearCookie("token");

      res.status(401).send("no user");
      return;
    }

    const id = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({ where: { id } });

    if (user === null) {
      res.status(400).send("no user");

      return;
    }

    req.uuser = user;

    next();
  },
  async userExists(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { email } = req.body;

    if (email === undefined) {
      res.status(400).send("email is null");

      return;
    }

    const user = await User.findOne({ where: { email } });

    if (user === null) {
      // Don't send an error to not inform a potential hacker the user doesn't exist
      // The frontend will display a message like "if user exists, a reset password email has been sent"
      res.status(200).send();

      return;
    }

    // Don't send an error message if email is invalid, in case of hacker,
    // he cannot know if the email input is valid
    req.uuser = user;

    next();
  },
  async isPremium(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    if (req.uuser === undefined) {
      throw new Error("user is undefined");
    }
    if (!isPremium(req.uuser)) {
      res.status(400).send("Not allowed, not premium");
      return;
    }

    next();
  },
  async isNotPremium(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    if (req.uuser === undefined) {
      throw new Error("user is undefined");
    }
    if (isPremium(req.uuser)) {
      res.status(400).send("Not allowed,already premium");
      return;
    }

    next();
  },
  async isAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    if (req.uuser === undefined) {
      throw new Error("user is undefined");
    }
    if (!isAdmin(req.uuser)) {
      res.status(400).send("Not allowed, not admin");
      return;
    }

    next();
  },
  async isAdminOrCurrentUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const token = req.cookies.token;

    if (!token) {
      res.status(400).send("no user");
      return;
    }

    const requestingUserId = jwt.verify(token, process.env.JWT_SECRET);

    const userRequestingUpdate = await User.findOne({
      where: { id: requestingUserId },
    });

    const userToUpdate = await User.findOne({ where: { id: req.body.id } });
    if (userToUpdate === null) {
      throw new Error("user is null");
    }
    if (userRequestingUpdate === null) {
      throw new Error("user is null");
    }
    if (
      !isAdmin(userRequestingUpdate) &&
      userToUpdate.id != userRequestingUpdate.id
    ) {
      res.status(400).send("Not allowed, not admin");
      return;
    }
    req.uuser = userToUpdate;

    next();
  },
  async verifyEmail(req: Request, res: Response): Promise<void> {
    const emailVerificationString = req.params.emailVerificationString;

    const user = await User.findOne({ where: { emailVerificationString } });

    if (user) {
      user.isEmailVerified = true;

      user.save();

      res.send(
        `<a href=${process.env.ALLOWED_DOMAIN}>Email well verified, back to the app</a>`
      );
    } else {
      res.send(
        `An error occured while validating email, you might have received a more recent email.`
      );
    }
  },
};

export default AuthController;
