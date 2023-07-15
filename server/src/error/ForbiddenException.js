const msg = require("../messages");
module.exports = function ForbiddenException(message) {
  this.status = 403;
  this.message = message || msg.inactive_authentication_failure;
};
