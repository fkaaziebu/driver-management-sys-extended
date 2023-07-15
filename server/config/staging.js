module.exports = {
  database: {
    database: "dms-v1",
    username: "postgres",
    password: "1234",
    dialect: "postgres",
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
  uploadDir: "uploads-staging",
  profileDir: "profile",
  logFileName: "app-staging.log",
  logFolderName: "logs-staging/",
};
