declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SITE_URL: string;
      MESSAGE_FORM_URL: string;
      MEETUP_SECTION_URL: string;
      SESSION_FILENAME: string;
      PORT: number;
      DATABASE_DEV_URL: string;
      GOOGLE_CLIENT_SECRET: string;
      GOOGLE_CLIENT_ID: string;
      JWT_SECRET: string;
      ALLOWED_DOMAIN: string;
      DATABASE_URL: string;
      NODEMAILER_EMAIL: string;
      NODEMAILER_PASSWORD: string;
      API_URL: string;
      EMAIL_TEST: string;
      NEXT_PUBLIC_ENDPOINT: string;
      NODE_ENV: "development" | "production";
      NEXT_PUBLIC_PAYPAL_CLIENT_ID: string;
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: string;
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
