module.exports = {
  development: {
    database: "ImLazyDb",
    use_env_variable: "DATABASE_DEV_URL",
    url: "postgres://baptiste:password@localhost:5432/ImLazyDb",
    dialect: "postgres",
  },
  // production: {
  //   database: "d18b5hcup39vac",
  //   use_env_variable: "DATABASE_URL",
  //   // url:'postgres://kmswtpdkbbvtzd:33213cd29ff256fc59753291b17ee9327d05de9779bf852bc30a71b92c16c1dc@ec2-3-212-45-192.compute-1.amazonaws.com:5432/d18b5hcup39vac',
  //   // use_env_variable: "DATABASE_DEV_URL",
  //   dialect: "postgres",
  //   dialectOptions: {
  //     ssl: {
  //       require: true,
  //       rejectUnauthorized: false,
  //     },
  //   },
  // },
};
