import { sendMail } from "../services/mails";
import { capitalizeFirstLetter } from "../utils/functions";
const Payment = require("../db/models").Payment;

// To generate uuids
const { v4: uuidV4 } = require("uuid");

// To encrypt and verify passwords
const bcrypt = require("bcrypt");
const saltRounds = 10;

// To use authorization tokens
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;

// For postgresql client
const { Client } = require("pg");

const User = require("../db/models").User;

export const getUser = (req, res, next) => {
  res.status(200).send(req?.user);
};

export const resetPassword = (req, res, next) => {
  const user = req.user;
  if (user) {
    var randomPassword = Math.random().toString(36).slice(-8);

    bcrypt.hash(
      randomPassword,
      saltRounds,
      async function (err: Error, password: string) {
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
          res.status(401).send();
        }
      }
    );
  } else {
    res.status(500).send();
  }
};

export const getUsers = async (req, res, next) => {
  const users = await User.findAll();

  if (users) {
    res.status(200).send({ users });
  } else {
    res.status(400).send("error getting users");
  }
};
export const deleteUserById = async (req, res, next) => {
  const id = req.params.id;

  const userToDelete = await User.findOne({ where: { id } });

  if (userToDelete) {
    userToDelete.destroy();
    res.status(200).send();
  } else {
    res.status(400).send("no user to delete");
  }
};

export const updateUserById = async (req, res, next) => {
  const id = req.body.id;
  const email = req.body.email;
  const name = req.body.name;
  const role = req.body.role;

  const user = await User.findOne({ where: { id } });

  user.email = email;
  user.name = name;
  user.role = role;

  await user.save();

  res.status(200).send();
};

export const createUser = async (req, res, next) => {
  const email = req.body.email;
  const name = req.body.name;
  const role = req.body.role;

  var randomPassword = Math.random().toString(36).slice(-8);

  bcrypt.hash(
    randomPassword,
    saltRounds,
    async function (err: Error, password: string) {
      const emailVerificationString = uuidV4();

      try {
        await User.create({
          email,
          name,
          password,
          role,
          emailVerificationString,
        });

        sendMail({
          from: "ImLazy app",
          to: process.env.EMAIL_TEST ?? email,
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
        res.status(401).send();
      }
    }
  );
};

export const updateUserPasswordById = async (req, res, next) => {
  const user = req.user;

  bcrypt.compare(
    req.body.currentPassword,
    user.password,
    function (err: Error, isMatch: boolean) {
      if (!isMatch) {
        return res.status(401).send();
      }

      bcrypt.hash(
        req.body.newPassword,
        saltRounds,
        async function (err: Error, password: string) {
          user.password = password;

          user.save();
          res.status(200).send();
        }
      );
    }
  );
};

export const sendVerificationEmail = async (req, res, next) => {
  const email = req.body.email;

  const emailVerificationString = uuidV4();

  try {
    const user = await User.findOne({ where: { email } });

    user.emailVerificationString = emailVerificationString;
    user.save();

    sendMail({
      from: "ImLazy app",
      to: process.env.EMAIL_TEST ?? email,
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
    res.status(401).send();
  }
};

export const savePayment = async (req, res, next) => {
  const user = req.user;

  await Payment.create({
    userId: user.id,
    details: req.body.paymentResume,
  });

  user.role = "premium";
  user.save();

  try {
    res.status(200).send();
  } catch (err) {
    res.status(401).send();
  }
};
