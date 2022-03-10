module.exports = {
  development: {
    database: "ImLazyDb",
    use_env_variable: "DATABASE_DEV_URL",
    dialect: "postgres",
  },
  production: {
    username: "kmswtpdkbbvtzd",
    password: "33213cd29ff256fc59753291b17ee9327d05de9779bf852bc30a71b92c16c1dc",
    database: "d18b5hcup39vac",
    host: "ec2-3-212-45-192.compute-1.amazonaws.com",
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};
