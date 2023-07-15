function generatePassword(length, options = {}) {
  let raw = "";
  length = 10;
  options.numeric = true;
  options.uppercase = true;
  options.lowercase = true;
  options.symbols = false;

  if (options.numeric) {
    raw += "0123456789";
  }

  if (options.uppercase) {
    raw += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  }

  if (options.lowercase) {
    raw += "abcdefghijklmnopqrstuvwxyz";
  }

  if (options.symbols) {
    raw += "~`!@#$%^&*()_+-={}[]:\";'<>?,./|\\";
  }

  let result = "";

  for (let i = 0; i < length; i++) {
    result += raw[Math.floor(Math.random() * raw.length)];
  }

  return result;
}

module.exports = generatePassword;
