import { PassportStatic } from "passport";
import { User } from "../db/models/User";
// import { User:UserExpress } from "express";
import { Request } from "express";
import { capitalizeFirstLetter } from "../utils/functions";
import { sendMail } from "./mails";
const { v4: uuidV4 } = require("uuid");

const GoogleTokenStrategy = require("passport-google-token").Strategy;
const LocalStrategy = require("passport-local");

// To encrypt and verify passwords
const bcrypt = require("bcrypt");
const saltRounds = 10;
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

module.exports = (passport: PassportStatic): void => {
  passport.use(
    new GoogleTokenStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: GoogleProfileRaw,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          console.log("An error occured while local signin:", error);
          return done(null, false);
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
      async (req: Request, email: string, password: string, done: Function) => {
        try {
          const existingEmailAccount = await User.findOne({
            where: { email: email },
          });
          console.log(existingEmailAccount);

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
              req.uuser = existingEmailAccount;

              return done(null, existingEmailAccount);
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
      async (req: Request, email: string, password: string, done: Function) => {
        try {
          const existingEmailAccount = await User.findOne({
            where: { email: email },
          });

          if (existingEmailAccount) {
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

  // passport.serializeUser(
  //   (user: Express.User, done: (err: any, id?: number | undefined) => void) => {
  //     done(null, user.id);
  //   }
  // );

  // passport.deserializeUser(
  //   (id: string, done: (arg1: null, user: User) => void): void => {
  //     User.findByPk(id)
  //       .then((user: User | null): void => {
  //         if (user === null) {
  //           throw new Error("user is null");
  //         }
  //         done(null, user);
  //       })
  //       .catch((error: Error) => {
  //         throw new Error(JSON.stringify(error));
  //       });
  //   }
  // );
};
