const msg = require("../messages");
module.exports = function EmailException() {
  this.message = msg.email_failure;
  this.status = 502;
};
