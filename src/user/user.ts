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
  if (req.user) {
    //TODO: send a reset password email to user.email
  }
  //Don't send an error message if email is invalid, in case of hacker,
  // he cannot know if the email input is valid
  res.status(200).send();
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

  // TODO: generate password and send it by email
  bcrypt.hash(
    "imlazy2022",
    saltRounds,
    async function (err: Error, password: string) {
      const user = await User.build({ email, name, password, role });

      await user.save();

      res.status(200).send();
    }
  );
};
