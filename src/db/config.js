module.exports = {
  development: {
    database: "ImLazyDb",
    use_env_variable: "DATABASE_DEV_URL",
    dialect: "postgres",
  },
  production: {
    database: "d18b5hcup39vac",
    use_env_variable: "DATABASE_URL",
    database:"d18b5hcup39vac",
    use_env_variable:"DATABASE_URL",
    dialect: "postgres",
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};
