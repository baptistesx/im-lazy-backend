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

export const sendMail = (mailOptions: MailOptions): void => {
  transporter.sendMail(mailOptions).catch((error: string) => {
    console.log(error);
  });
};
