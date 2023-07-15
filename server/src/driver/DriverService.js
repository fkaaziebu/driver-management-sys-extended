const Driver = require("./Driver");
const sequelize = require("../config/database");
const generatePassword = require("../shared/generatePassword");
const EmailService = require("../email/EmailService");
const EmailException = require("../email/EmailException");
const bcrypt = require("bcrypt");

const save = async (body) => {
  const { email, driverLicense } = body;

  const oneTimePassword = generatePassword(10);
  const hash = await bcrypt.hash(oneTimePassword, 10);

  // Transaction allows for saving or droping of driver table and profile
  const transaction = await sequelize.transaction();

  await Driver.create(
    {
      email,
      driverLicense,
      activationToken: hash,
    },
    { transaction }
  );

  try {
    // Send email of the password to be used for the account
    await EmailService.sendDriverActivationToken(email, oneTimePassword);
    // If everything goes well, save the table creations
    await transaction.commit();
  } catch (err) {
    // If anything goes wrong, rollback the table creations
    await transaction.rollback();
    // Send an email exception to frontend
    throw new EmailException();
  }
};

const findByEmail = async (email) => {
  // Find a driver by a specific email and return
  return await Driver.findOne({ where: { email: email } });
};

const activate = async (driver, password) => {
  const hash = await bcrypt.hash(password, 10);
  driver.isActivated = true;
  driver.password = hash;
  driver.activationToken = null;

  await driver.save();
};

module.exports = { save, findByEmail, activate };
