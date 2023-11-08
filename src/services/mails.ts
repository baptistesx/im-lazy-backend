import { capitalizeFirstLetter } from "../utils/functions";
const nodemailer = require("nodemailer");

type MailOptions = {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD,
  },
});

type SendWelcomeMailProps = {
  email: string;
  name: string;
  verificationString: string;
};

export const sendWelcomeMail = ({
  email,
  name,
  verificationString,
}: SendWelcomeMailProps): void => {
  sendMail({
    from: "ImLazy app",
    to: process.env.EMAIL_TEST ?? email,
    subject: "Welcome to ImLazy app!",
    html: `<p>Welcome ${capitalizeFirstLetter(name)} on ImLazy app !</p>
                <p>You'll discover all the lazy ressources available !</p>
                <p>Last step to verify your account, press <a href="${
                  process.env.API_URL
                }:${process.env.PORT}/verify/${verificationString}">Here</a></p>
                <p>Enjoy</p>
                <p>The ImLazy Team</p>`,
  });
};

type SendWelcomeCreatedByAdminMailProps = {
  email: string;
  name: string;
  verificationString: string;
  randomPassword: string;
};

export const sendWelcomeCreatedByAdminMail = ({
  email,
  name,
  verificationString,
  randomPassword,
}: SendWelcomeCreatedByAdminMailProps): void => {
  sendMail({
    from: "ImLazy app",
    to: process.env.EMAIL_TEST ?? email,
    subject: "Welcome to ImLazy app!",
    html: `<p>Welcome ${capitalizeFirstLetter(name)} on ImLazy app !</p>
                <p>You'll discover all the lazy ressources available !</p>
                <p>Here is your password (don't hesisate to change it on your profile page): ${randomPassword}</p>
                <p>Last step to verify your account, press 
                <a href="${process.env.API_URL}${
      process.env.NODE_ENV === "production" ? "" : `:${process.env.PORT}`
    }:/verify/${verificationString}">Here</a>
                </p>
                <p>Enjoy</p>
                <p>The ImLazy Team</p>`,
  });
};

type SendResetPasswordMailProps = {
  email: string;
  name: string;
  randomPassword: string;
};

export const sendResetPasswordMail = ({
  email,
  name,
  randomPassword,
}: SendResetPasswordMailProps): void => {
  sendMail({
    from: "ImLazy app",
    to: process.env.EMAIL_TEST ?? email,
    subject: "ImLazy app password!",
    html: `<p>Hi ${capitalizeFirstLetter(name)},</p>
          <p>Here is your new password (don't hesisate to change it on your profile page): ${randomPassword}</p>
          <a href=${process.env.ALLOWED_DOMAIN}>ImLazy app</a>
          <p>Enjoy</p>
          <p>The ImLazy Team</p>`,
  });
};

export const sendMail = (mailOptions: MailOptions): void => {
  transporter.sendMail(mailOptions).catch((error: string) => {
    console.log(error);
  });
};
