const express = require("express");
const DriverService = require("../driver/DriverService");
const TokenService = require("./TokenService");
const DriverAuthenticationException = require("./DriverAuthenticationException");
const ValidationException = require("../error/ValidationException");
const ForbiddenException = require("../error/ForbiddenException");
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const msg = require("../messages");
const EmailService = require("../email/EmailService");
const EmailException = require("../email/EmailException");
const generatePassword = require("../shared/generatePassword");

const router = express.Router();

router.post("/api/1.0/auth/email", async (req, res, next) => {
  const { email } = req.body;
  const driver = await DriverService.findByEmail(email);

  if (!driver) {
    return next(new DriverAuthenticationException());
  }

  res.status(200).send({ isActivated: driver.isActivated });
});

router.post(
  "/api/1.0/auth/activate",
  check("email").isEmail().withMessage(msg.authentication_failure),
  check("password")
    .notEmpty()
    .withMessage(msg.password_null)
    .bail()
    .isLength({ min: 6 })
    .withMessage(msg.password_size)
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage(msg.password_pattern),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // If any input validation errors, throw an exception
      return next(new ValidationException(errors.array()));
    }

    const { email, activationToken, password } = req.body;

    const driver = await DriverService.findByEmail(email);

    if (!driver) {
      return next(new DriverAuthenticationException());
    }

    const isSameToken = await bcrypt.compare(
      activationToken,
      driver.activationToken
    );

    if (!isSameToken) {
      return next(new DriverAuthenticationException());
    }

    await DriverService.activate(driver, password);

    res.send({
      message: "Account successfully activated",
      isActivated: driver.isActivated,
    });
  }
);

router.post(
  "/api/1.0/auth/login",
  check("email").isEmail().withMessage(msg.authentication_failure),
  async (req, res, next) => {
    const { email, password } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // If any input validation errors, throw an exception
      return next(new ValidationException(errors.array()));
    }

    const driver = await DriverService.findByEmail(email);
    if (!driver) {
      return next(new DriverAuthenticationException());
    }

    const match = await bcrypt.compare(password, driver.password);
    if (!match) {
      return next(new DriverAuthenticationException());
    }

    const token = await TokenService.createToken(driver);

    res.send({ message: msg.login_success, token, email: driver.email });
  }
);

router.post(
  "/api/1.0/auth/sendEmailForPasswordReset",
  async (req, res, next) => {
    const { driverLicense, email } = req.body;

    const driver = await DriverService.findByEmail(email);

    if (!driver) {
      return next(new DriverAuthenticationException());
    }

    if (driver.isActivated === false) {
      return next(new ForbiddenException());
    }

    if (driver.driverLicense !== driverLicense) {
      return next(new ForbiddenException(msg.wrong_license_info));
    }

    const passwordResetToken = generatePassword(10);
    driver.passwordResetToken = await bcrypt.hash(passwordResetToken, 10);

    try {
      // Send email of the password to be used for the account
      await EmailService.sendDriverActivationToken(email, passwordResetToken);
      await driver.save();
      res.send({ message: "Password reset token sent to your email" });
    } catch (err) {
      // Send an email exception to frontend
      return next(new EmailException());
    }
  }
);

router.post("/api/1.0/auth/passwordReset", async (req, res, next) => {
  const { passwordResetToken, password, email } = req.body;

  const driver = await DriverService.findByEmail(email);

  if (!driver) {
    return next(new ForbiddenException(msg.authentication_failure));
  }

  if (driver.passwordResetToken === null) {
    return next(new ForbiddenException(msg.authentication_failure));
  }

  const compareResetToken = await bcrypt.compare(
    passwordResetToken,
    driver.passwordResetToken
  );
  if (!compareResetToken) {
    return next(new ForbiddenException(msg.authentication_failure));
  }

  const hash = await bcrypt.hash(password, 10);
  driver.password = hash;
  driver.passwordResetToken = null;
  driver.save();

  res.send({
    message: "Password reset successfull",
    isActivated: driver.isActivated,
  });
});

module.exports = router;
