const config = require("dotenv").config;

const User = require("../db/models").User;

const GoogleTokenStrategy = require("passport-google-token").Strategy;
var LocalStrategy = require("passport-local");

// To encrypt and verify passwords
const bcrypt = require("bcrypt");
const saltRounds = 10;

config();

const getProfileFromGoogleData = (profile) => {
  const { id, displayName, emails, provider } = profile;

  if (emails?.length) {
    const email = emails[0].value;
    return {
      googleId: id,
      name: displayName,
      email,
      provider,
    };
  }
  return null;
};

module.exports = function (passport) {
  passport.use(
    new GoogleTokenStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const existingGoogleAccount = await User.findOne({
            where: { googleId: profile.id },
          });

          if (!existingGoogleAccount) {
            const existingEmailAccount = await User.findOne({
              where: { email: getProfileFromGoogleData(profile).email },
            });

            if (!existingEmailAccount) {
              const newAccount = await User.create(getProfileFromGoogleData(profile));

              return done(null, newAccount);
            }
            return done(null, existingEmailAccount);
          }
          return done(null, existingGoogleAccount);
        } catch (error) {
          throw new Error(error);
        }
      }
    )
  );

  // local signin
  passport.use(
    "local-signin",
    new LocalStrategy(
      {
        // by default, local strategy uses username and password, we will override with email
        usernameField: "email",
        passwordField: "password",
        passReqToCallback: true, // allows us to pass back the entire request to the callback
      },
      async (req, email, password, done) => {
        try {
          const existingEmailAccount = await User.findOne({
            where: { email: email },
          });

          if (!existingEmailAccount) {
            return done(null, false, {
              message: "Incorrect username or password.",
            });
          }

          bcrypt.compare(
            password,
            existingEmailAccount.password,
            function (err, result) {
              if (err || !result) {
                return done(null, false, {
                  message: "Bad password",
                });
              }
              req.user = existingEmailAccount;

              return done(null, existingEmailAccount);
            }
          );
        } catch (error) {
          throw new Error(error);
        }
      }
    )
  );

  // local signup
  passport.use(
    "local-signup",
    new LocalStrategy(
      {
        // by default, local strategy uses username and password, we will override with email
        usernameField: "email",
        passwordField: "password",
        passReqToCallback: true, // allows us to pass back the entire request to the callback
      },
      async (req, email, password, done) => {
        try {
          const existingEmailAccount = await User.findOne({
            where: { email: email },
          });
          if (existingEmailAccount) {
            return done(null, false, {
              message: "Account already used.",
            });
          }

          //TODO: use sequelize hook to encrypt password automatically
          bcrypt.hash(password, saltRounds, async function (err, hash) {
            const newAccount = await User.create({
              name: req.body.name,
              email: email,
              password: hash,
            });

            return done(null, newAccount);
          });
        } catch (error) {
          throw new Error(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    User.findByPk(id)
      .then((user) => {
        done(null, user);
      })
      .catch((error) => done(error));
  });
};
