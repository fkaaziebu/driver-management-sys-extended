const express = require("express");
const msg = require("../messages");
const DriverService = require("./DriverService");
const { check, validationResult } = require("express-validator");
const ValidationException = require("../error/ValidationException");

const router = express.Router();

router.post(
  "/api/1.0/drivers",
  check("email")
    .notEmpty()
    .withMessage("Email cannot be null")
    .bail()
    .isEmail()
    .withMessage(msg.email_invalid)
    .bail()
    .custom(async (email) => {
      const driver = await DriverService.findByEmail(email);
      if (driver) {
        throw new Error(msg.email_inuse);
      }
    }),
  check("driverLicense")
    .notEmpty()
    .withMessage("Driver License cannot be null"),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // If any input validation errors, throw an exception
      return next(new ValidationException(errors.array()));
    }

    try {
      await DriverService.save(req.body);
      return res.send({ message: "Driver created" });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
