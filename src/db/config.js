module.exports = {
  development: {
    database: "ImLazyDb",
    use_env_variable: "DATABASE_DEV_URL",
    url: "postgres://baptiste:password@localhost:5432/ImLazyDb",
    dialect: "postgres",
  },
};
