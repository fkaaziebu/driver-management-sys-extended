
module.exports = {
  database: {
    database: "dms",
    username: "dms-swe",
    password: "dms-pass",
    dialect: "sqlite",
    storage: "./database.sqlite",
    logging: false,
  },
  mail: {
    service: "gmail",
    auth: {
      user: "haaziebu@gmail.com",
      pass: "jppevhqlnferfoeh",
    },
  },
  mailConfig: {
    from: "haaziebu@gmail.com",
  },
  uploadDir: "uploads-dev",
  profileDir: "profile",
  logFileName: "app-dev.log",
  logFolderName: "logs-dev/",
};
