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
SELECT * FROM users WHERE id = '${newId}';
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

        const newUser = { ...result[1].rows[0] };
        // Remove password property
        delete newUser.password;

        res.send({
          status: "OK",
          message: "User well created",
          token: token,
          user: newUser,
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
  SELECT * FROM users WHERE email='${credentials.email}'
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
  const currentUserId = req.currentUserId;

  const query = `
  SELECT is_super_admin, is_admin, company FROM users WHERE id='${currentUserId}'
`;

  client.query(query, (err, result) => {
    if (err) {
    } else {
      const currentUser = result.rows[0];
      console.log(currentUser);

      if (currentUser.is_admin && currentUser.is_super_admin) {
        const queryAllMembers = `SELECT id, email, is_admin, is_premium, is_new_user, is_email_verified FROM users`;

        client.query(queryAllMembers, (err, result) => {
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
      } else if (currentUser.is_admin) {
        const queryAllMembers = `SELECT id, email, is_admin, is_premium, is_new_user, is_email_verified FROM users WHERE company='${currentUser.company}'`;

        client.query(queryAllMembers, (err, result) => {
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
      } else {
        res.status(403).json({
          message: "Not allowed ! (Not admin)",
        });
      }
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
  const userIdToDelete = req.params.id;

  const query = `DELETE FROM users WHERE id = '${userIdToDelete}';`;

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
