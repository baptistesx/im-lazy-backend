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
        sameSite: "strict",
        expires: new Date(new Date().getTime() + 60 * 60 * 1000),
        httpOnly: true,
      })
      .send({ user });
  },

  async signOut(req, res, next) {
    res.clearCookie("token");

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
  async isAdmin(req, res, next) {
    if (!req.user.isAdmin) {
      res.status(400).send("Not allowed, not admin");
      return;
    }

    next();
  },
};

export default AuthController;
