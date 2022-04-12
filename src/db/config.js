module.exports = {
  development: {
    use_env_variable: "DATABASE_DEV_URL",
    dialect: "postgres",
    models: [__dirname + "/**/models"],
  },
  production: {
    use_env_variable: "DATABASE_URL",
    dialect: "postgres",
    models: [__dirname + "/**/models"],
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};
