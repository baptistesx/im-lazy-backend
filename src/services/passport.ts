import { Request } from "express";
import { PassportStatic } from "passport";
import { User } from "../db/models/User";
import { sendWelcomeMail } from "./mails";

const { v4: uuidV4 } = require("uuid");

const GoogleTokenStrategy = require("passport-google-token").Strategy;
const LocalStrategy = require("passport-local");

// To encrypt and verify passwords
const bcrypt = require("bcrypt");
const saltRounds = 10;

// Necessary to use Express.User in serializeUser()
// TODO: how to not use this solution?
declare namespace Express {
  interface User {
    _id?: string;
  }
}

type GoogleProfileRaw = {
  id: string;
  displayName: string;
  emails: { value: string }[];
  provider: string;
};

type GoogleProfile = {
  googleId: string;
  name: string;
  email: string;
  provider: string;
};

const getGoogleProfile = (profile: GoogleProfileRaw): GoogleProfile => {
  const { id, displayName, emails, provider } = profile;

  return {
    googleId: id,
    name: displayName,
    email: emails[0].value,
    provider,
  };
};

export default (passport: PassportStatic): void => {
  // Google signin/signup
  passport.use(
    new GoogleTokenStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        passReqToCallback: true, // allows us to pass back the entire request to the callback
      },
      async (
        req: Request,
        _accessToken: string,
        _refreshToken: string,
        profile: GoogleProfileRaw,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        done: (arg0: null, arg1: any) => any // done (<no error>, <return "google" profile to serializeUser()>)
      ) => {
        try {
          const googleUser = await User.findOne({
            where: { googleId: profile.id },
          });

          if (googleUser === null) {
            const newUser = await User.create(getGoogleProfile(profile));
            req.uuser = newUser;

            const emailVerificationString: string = uuidV4();

            sendWelcomeMail({
              email: profile.emails[0].value,
              name: profile.displayName,
              verificationString: emailVerificationString,
            });

            return done(null, newUser);
          }

          req.uuser = googleUser;

          return done(null, googleUser);
        } catch (error) {
          console.log("An error occured while local signin:", error);

          return done(null, null);
        }
      }
    )
  );

  // local signin with email and password
  passport.use(
    "local-signin",
    new LocalStrategy(
      {
        // by default, local strategy uses username and password, we will override with email
        usernameField: "email",
        passwordField: "password",
        passReqToCallback: true, // allows us to pass back the entire request to the callback
      },
      // TODO: type more specifically res
      async (req: Request, email: string, password: string, done: Function) => {
        try {
          const user = await User.findOne({
            where: { email: email },
          });

          if (user === null) {
            return done(null, false, {
              message: "Incorrect username or password.",
            });
          }

          // Verify password
          bcrypt.compare(
            password,
            user.password,
            function (err: Error, isMatch: boolean) {
              if (err || !isMatch) {
                return done(null, false, {
                  message: "Bad password",
                });
              }

              req.uuser = user;

              return done(null, user);
            }
          );
        } catch (error) {
          console.log("An error occured while local signin:", error);

          return done(null, false, {
            message: "An error occured while local signin",
          });
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
      // TODO: type more specifically res
      async (req: Request, email: string, password: string, done: Function) => {
        try {
          const user = await User.findOne({
            where: { email: email },
          });

          if (user !== null) {
            return done(null, false, {
              message: "Account already used.",
            });
          }

          // TODO: use sequelize hook to encrypt password automatically
          bcrypt.hash(
            password,
            saltRounds,
            async function (_err: Error, hash: string) {
              const emailVerificationString: string = uuidV4();

              if (req.body.name === undefined) {
                throw new Error("name is undefined");
              }

              const newAccount = await User.create({
                name: req.body.name,
                email: email,
                password: hash,
                emailVerificationString: emailVerificationString,
              });

              req.uuser = newAccount;

              sendWelcomeMail({
                email,
                name: req.body.name,
                verificationString: emailVerificationString,
              });

              return done(null, newAccount);
            }
          );
        } catch (error) {
          console.log("An error occured while local signup:", error);

          return done(null, false, {
            message: "An error occured while local signup",
          });
        }
      }
    )
  );

  // Called with done() if user exists or has been created
  passport.serializeUser(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (user: Express.User, done: (err: any, id?: string | undefined) => void) => {
      done(null, JSON.stringify(user));
    }
  );

  passport.deserializeUser((id: string, done: Function) => {
    User.findByPk(id)
      .then((user: User | null) => {
        done(null, user);
      })
      .catch((error: Error) => done(error));
  });
};
