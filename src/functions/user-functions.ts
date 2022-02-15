const { v4: uuidV4 } = require("uuid");
const { Client } = require("pg");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;

const client = new Client({
  user: "baptiste",
  host: "localhost",
  database: "ImLazyDb",
  password: "password",
  port: 5432,
});

client.connect();
//TODO: is client.end(); necessary?

export const signup = (req, res, next) => {
  const credentials = req.body;

  bcrypt.hash(credentials.password, saltRounds, function (err, hash) {
    // Generate new uuid for the new user
    const newId = uuidV4();

    // Create new user and return it
    const query = `
INSERT INTO users (email, id, password)
VALUES ('${credentials.email}', '${newId}', '${hash}');
SELECT id, email, is_admin, is_premium, is_new_user, is_email_verified FROM users WHERE id = '${newId}';
`;
    client.query(query, (err, result) => {
      if (err) {
        console.error(err);
        //TODO: give more details on the error?
        res
          .status(403)
          .send({ status: "KO", message: "Error while creating user" });
      } else {
        // Generate session token with newId and SECRET_KEY
        const token = jwt.sign(
          {
            id: newId,
          },
          SECRET_KEY
        );

        res.send({
          status: "OK",
          message: "User well created",
          token: token,
          user: result[1].rows[0],
        });

        // Once signedup, the user is not new anymore
        client.query("UPDATE users SET is_new_user = false", (err, result) => {
          //TODO: necessary?
        });
      }
    });
  });
};

export const signin = (req, res, next) => {
  const credentials = req.body;

  const query = `
  SELECT id, password, email, is_admin, is_premium, is_new_user, is_email_verified FROM users WHERE email='${credentials.email}'
`;

  client.query(query, (err, result) => {
    if (err || result.rowCount === 0) {
      console.error(err);

      res.status(403).send({
        status: "KO",
        message: "This user doesn't exist  ",
      });
    } else {
      const user = result.rows[0];

      bcrypt.compare(
        credentials.password,
        user.password,
        function (err, result) {
          if (err) {
            res.status(403).send({
              status: "KO",
              message: "This user doesn't exist or incorrect password ",
            });
          } else {
            const token = jwt.sign(
              {
                id: user.id,
              },
              SECRET_KEY
            );

            // Remove password field before sending user to client
            delete user.password;

            res.send({
              status: "OK",
              message: "Welcome",
              user: user,
              token: token,
            });
          }
        }
      );
    }
  });
};

export const getUsers = (req, res, next) => {
  const credentials = req.body;

  const query = `SELECT id, email, is_admin, is_premium, is_new_user, is_email_verified FROM users`;

  client.query(query, (err, result) => {
    if (err) {
      console.error(err);
      res.status(403).send({
        status: "KO",
        message: "Error while getting users",
      });
    } else {
      res.send(result.rows);
    }
  });
};

export const toggleAdminRights = (req, res, next) => {
  const userId = req.body.id;

  const query = `UPDATE users SET is_admin = NOT is_admin WHERE id = '${userId}'`;

  client.query(query, (err, result) => {
    if (err) {
      console.error(err);
      res.status(403).send({
        status: "KO",
        message: "Error while toggling admin rights",
      });
    } else {
      res.send({ message: "User well update" });
    }
  });
};

export const deleteUserById = (req, res, next) => {
  const userId = req.params.id;

  const query = `DELETE FROM users WHERE id = '${userId}';`;

  client.query(query, (err, result) => {
    if (err) {
      console.error(err);
      res.status(403).send({
        status: "KO",
        message: "Error while deleting user",
      });
    } else {
      res.send({ message: "User well deleted" });
    }
  });
};
