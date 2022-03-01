const config = require("dotenv").config;

const User = require("../db/models").User;

const GoogleTokenStrategy = require("passport-google-token").Strategy;
var LocalStrategy = require("passport-local");

// To encrypt and verify passwords
const bcrypt = require("bcrypt");
const saltRounds = 10;

config();

type GoogleProfile = {
  id: number;
  displayName: string;
  emails: { value: string }[];
  provider: string;
};

const getGoogleProfile = (profile: GoogleProfile) => {
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

module.exports = function (passport: any) {
  passport.use(
    new GoogleTokenStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: GoogleProfile,
        done: (arg0: null, arg1: any) => any
      ) => {
        try {
          const existingGoogleAccount = await User.findOne({
            where: { googleId: profile.id },
          });

          if (!existingGoogleAccount) {
            const existingEmailAccount = await User.findOne({
              where: { email: getGoogleProfile(profile)?.email },
            });

            if (!existingEmailAccount) {
              const newAccount = await User.create(getGoogleProfile(profile));

              return done(null, newAccount);
            }
            return done(null, existingEmailAccount);
          }
          return done(null, existingGoogleAccount);
        } catch (error) {
          throw new Error("Error checking Google account");
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
      async (req: any, email: string, password: string, done: Function) => {
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
            function (err: Error, isMatch: boolean) {
              if (err || !isMatch) {
                return done(null, false, {
                  message: "Bad password",
                });
              }
              req.user = existingEmailAccount;

              return done(null, existingEmailAccount);
            }
          );
        } catch (error) {
          throw new Error("An error occured while local signin");
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
      async (req: any, email: string, password: string, done: Function) => {
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
          bcrypt.hash(
            password,
            saltRounds,
            async function (err: Error, hash: string) {
              const newAccount = await User.create({
                name: req.body.name,
                email: email,
                password: hash,
              });

              return done(null, newAccount);
            }
          );
        } catch (error) {
          throw new Error("An error occured while local signup");
        }
      }
    )
  );

  passport.serializeUser((user: any, done: Function) => {
    done(null, user.id);
  });

  passport.deserializeUser((id: string, done: Function) => {
    User.findByPk(id)
      .then((user: any) => {
        done(null, user);
      })
      .catch((error: Error) => done(error));
  });
};
