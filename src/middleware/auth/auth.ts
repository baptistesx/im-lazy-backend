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

export const isAuthenticated = (req, res, next) => {
  try {
    const token = req.headers.authorization;

    const decodedToken = jwt.verify(token, SECRET_KEY);

    const userId = decodedToken.id;

    req.currentUserId = userId;

    next();
  } catch {
    res.status(401).json({
      message: "Not allowed ! (Not authenticated)",
    });
  }
};

export const isAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization;

    const decodedToken = jwt.verify(token, SECRET_KEY);

    const userId = decodedToken.id;
    req.currentUserId = userId;

    const query = `SELECT is_admin FROM users WHERE id = '${userId}';`;

    client.query(query, (err, result) => {
      if (err) {
        throw "Invalid token";
      } else {
        console.log("admin check valid")
        next();
      }
    });
  } catch {
    res.status(403).json({
      message: "Not allowed ! (Not admin)",
    });
  }
};
