const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;
const { Client } = require("pg");

const client = new Client({
  user: "baptiste",
  host: "localhost",
  database: "ImLazyDb",
  password: "password",
  port: 5432,
});
client.connect();

export const isAuthenticated = (req, res, next) => {
  try {
    const token = req.headers.authorization;
    jwt.verify(token, SECRET_KEY);
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
    const id = decodedToken.id;

    const query = `SELECT is_admin FROM users WHERE id = '${id}';`;

    client.query(query, (err, result) => {
      if (err) {
        throw "Invalid token";
      } else {
        next();
      }
    });
  } catch {
    res.status(403).json({
      message: "Not allowed ! (Not admin)",
    });
  }
};