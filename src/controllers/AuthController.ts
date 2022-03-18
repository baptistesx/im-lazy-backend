import { isAdmin, isPremium } from "../utils/functions";

const jwt = require("jsonwebtoken");

const User = require("../db/models").User;

const AuthController = {
  async signIn(req, res, next) {
    const { user } = req;
    if (!user) {
      return res.status(401).send({ error: "User was not authenticated" });
    }

    const token = jwt.sign(user.id, process.env.JWT_SECRET);

    res
      .status(200)
      .cookie("token", token, {
        secure: process.env.NODE_ENV !== "development",
        sameSite: "Strict",
        expires: new Date(new Date().getTime() + 2 * 60 * 60 * 1000),
        httpOnly: true,
        domain: process.env.NODE_ENV === "production" ? "imlazy.app" : "", //TODO: use env var
      })
      .send({ user });

    user.lastLogin = new Date();

    await user.save();
  },

  async signOut(req, res, next) {
    res.clearCookie("token", {
      domain: process.env.NODE_ENV === "production" ? "imlazy.app" : "",
    });

    res.status(200).send();
  },
  async isLoggedIn(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
      res.status(400).send("no user");
      return;
    }

    var id = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({ where: { id } });

    if (user) {
      req.user = user;

      next();
    } else {
      res.status(400).send("no user");
    }
  },
  async userExists(req, res, next) {
    const email = req.body.email;

    const user = await User.findOne({ where: { email } });
    //Don't send an error message if email is invalid, in case of hacker,
    // he cannot know if the email input is valid
    req.user = user;

    next();
  },
  async isPremium(req, res, next) {
    if (!isPremium(req.user)) {
      res.status(400).send("Not allowed, not premium");
      return;
    }

    next();
  },
  async isNotPremium(req, res, next) {
    if (isPremium(req.user)) {
      res.status(400).send("Not allowed,already premium");
      return;
    }

    next();
  },
  async isAdmin(req, res, next) {
    if (!isAdmin(req.user)) {
      res.status(400).send("Not allowed, not admin");
      return;
    }

    next();
  },
  async isAdminOrCurrentUser(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
      res.status(400).send("no user");
      return;
    }

    var id = jwt.verify(token, process.env.JWT_SECRET);

    if (!isAdmin(req.user) && id != req.body.id) {
      res.status(400).send("Not allowed, not admin");
      return;
    }

    next();
  },
  async verifyEmail(req, res, next) {
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
