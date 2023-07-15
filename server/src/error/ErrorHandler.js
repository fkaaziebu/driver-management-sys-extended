// const { log } = require("../shared/logger");
module.exports = (err, req, res, next) => {
  const { status, message, errors } = err;

  // log.error(`${req.url}\t${req.method}\t${status}\t${message}`);
  // log.info({...req.body})

  let validationErrors;
  if (errors) {
    validationErrors = {};
    errors.forEach((error) => {
      validationErrors[error.path] = error.msg;
      // log.error(error);
    });
  }

  res.status(status).send({
    path: req.originalUrl,
    timestamp: new Date().getTime(),
    message: message,
    validationErrors,
  });
};
