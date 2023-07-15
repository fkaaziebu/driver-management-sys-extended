const msg = require("../messages");

module.exports = function AuthenticationException() {
  this.status = 401;
  this.message = msg.authentication_failure;
};
