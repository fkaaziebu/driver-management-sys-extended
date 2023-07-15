module.exports = {
  database: {
    database: "dms",
    username: "dms-swe",
    password: "dms-pass",
    dialect: "sqlite",
    storage: ":memory:",
    logging: false,
  },
  mail: {
    host: "localhost",
    port: 8587,
    tls: {
      rejectUnauthorized: false,
    },
  },
  mailConfig: {
    from: "My App <info@my-app.com>",
  },
  uploadDir: "uploads-test",
  profileDir: "profile",
  logFileName: "app-test.log",
  logFolderName: "logs-test/",
};
