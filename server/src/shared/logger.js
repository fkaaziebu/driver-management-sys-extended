const { getLogger, configure } = require("log4js");
const config = require("config");
const { logFileName, logFolderName } = config;

configure({
  appenders: {
    app: { type: "file", filename: logFileName },
    out: { type: "stdout" },
    multi: {
      type: "multiFile",
      base: logFolderName,
      property: "categoryName",
      extension: ".log",
      maxLogSize: 1024 * 1024,
      backup: 3,
      compress: true,
    },
  },
  categories: {
    default: {
      appenders: ["app", "out", "multi"],
      level: "debug",
    },
  },
});

const log = getLogger();

const logger = (err, req) => {
  const { status, message, errors } = err;

  log.info(`${req.url}\t${req.method}\t${req.body}`);

  if (errors) {
    log.error(req.orginalUrl);
    errors.forEach((error) => {
      log.error(error);
    });
    log.info(`${message}\t${status}`);
  }
};

module.exports = { log, logger };
