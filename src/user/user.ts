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

export const getUsers = (req, res, next) => {
  const currentUserId = req.currentUserId;

  // First, check users rights
  const query = `
  SELECT is_super_admin, is_admin, company FROM users WHERE id='${currentUserId}'
`;
  try {
    client.query(query, (err, result) => {
      if (err) {
        //TODO?
      } else {
        const currentUser = result.rows[0];

        // If user is admin or super admin => get all users
        if (currentUser.is_admin && currentUser.is_super_admin) {
          const queryAllMembers = `
        select u.id, u.email, u.is_admin,u.name,  u.is_super_admin, u.is_premium, u.is_email_verified, c.id AS company_id, c.name AS company_name 
        from users AS u 
        left join companies AS c on u.company = c.id
        `;

          client.query(queryAllMembers, (err, result) => {
            if (err) {
              console.error(err);
              res.status(403).send({
                status: "KO",
                message: "Error while getting users",
              });
            } else {
              const usersWithoutPasswords = result.rows.map((user) => {
                const tempUser = { ...user };
                delete tempUser.password;
                return tempUser;
              });
              res.send(usersWithoutPasswords);
            }
          });
        } else {
          // Else if admin, get users with the same company id
          const queryAllMembers = `select u.id, u.email, u.name, u.is_admin, u.is_super_admin, u.is_premium, u.is_email_verified, c.id AS company_id, c.name AS company_name 
        from users AS u 
        left join companies AS c on u.company = c.id WHERE u.company='${currentUser.company}'`;

          client.query(queryAllMembers, (err, result) => {
            if (err) {
              console.error(err);
              res.status(403).send({
                status: "KO",
                message: "Error while getting users",
              });
            } else {
              const usersWithoutPasswords = result.rows.map((user) => {
                const tempUser = { ...user };
                delete tempUser.password;
                console.log(tempUser);
                return tempUser;
              });
              res.send(usersWithoutPasswords);
            }
          });
        }
      }
    });
  } catch (err) {
    res.status(401).json({
      message: "Failed to get users",
    });
  }
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

export const getCompanies = (req, res, next) => {
  const currentUserId = req.currentUserId;

  const query = `
  SELECT is_super_admin FROM users WHERE id='${currentUserId}'
`;

  client.query(query, (err, result) => {
    if (err) {
      // TODO ?
    } else {
      const currentUser = result.rows[0];
      console.log(currentUser);

      // Only super admin can get all companies
      if (currentUser.is_super_admin) {
        const queryCompanies = `SELECT * FROM companies`;

        client.query(queryCompanies, (err, result) => {
          if (err) {
            console.error(err);
            res.status(403).send({
              status: "KO",
              message: "Error while getting companies",
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

export const updateUserById = (req, res, next) => {
  console.log(req.body);
  const query = `
  UPDATE users SET email = '${req.body.email}', is_admin = ${req.body.is_admin},is_premium = ${req.body.is_premium},name = '${req.body.name}',company= '${req.body.company}' WHERE id='${req.body.id}'
`;

  client.query(query, (err, result) => {
    if (err) {
      console.error(err);
      res.status(403).send({
        status: "KO",
        message: "Error while updating user",
      });
    } else {
      res.send({ message: "User well updated" });
    }
  });
};

export const createUser = (req, res, next) => {
  console.log(req.body);
  const newId = uuidV4();
  console.log(newId);
  const query = `
  INSERT INTO users (email, password, id, is_admin, is_premium, name, company) VALUES('${req.body.email}', 'password', '${newId}', ${req.body.is_admin}, ${req.body.is_premium}, '${req.body.name}', '${req.body.company_id}');
`;
  console.log(query);
  client.query(query, (err, result) => {
    if (err) {
      console.error(err);
      res.status(403).send({
        status: "KO",
        message: "Error while creating user",
      });
    } else {
      res.send({ message: "User well created" });
    }
  });
};
