const request = require("supertest");
const app = require("../src/app");
const Driver = require("../src/driver/Driver");
const sequelize = require("../src/config/database");
const bcrypt = require("bcrypt");
const msg = require("../src/messages");
const SMTPServer = require("smtp-server").SMTPServer;

let lastMail, server;
let simulateSmtpFailure = false;

beforeAll(async () => {
  server = new SMTPServer({
    authOptional: true,
    onData(stream, session, callback) {
      let mailBody;
      stream.on("data", (data) => {
        mailBody += data.toString();
      });
      stream.on("end", () => {
        if (simulateSmtpFailure) {
          const err = new Error("Invalid mailbox");
          err.responseCode = 553;
          return callback(err);
        }
        lastMail = mailBody;
        callback();
      });
    },
  });
  await server.listen(8587, "localhost");

  if (process.env.NODE_ENV === "test") {
    await sequelize.sync();
  }

  jest.setTimeout(20000);
});

beforeEach(async () => {
  simulateSmtpFailure = false;
  await Driver.destroy({ truncate: { cascase: true } });
});

afterAll(async () => {
  await server.close();
  jest.setTimeout(5000);
});

const validDriver = {
  email: "user1@mail.com",
  driverLicense: "GHB4355ioiFDFCV",
};

const addDriverToDatabase = async (driver = { ...validDriver }) => {
  return await Driver.create({
    ...driver,
  });
};

const authenticateDriverEmail = async (email) => {
  return await request(app).post("/api/1.0/auth/email").send({ email });
};

const activateDriver = async (credentials) => {
  return await request(app).post("/api/1.0/auth/activate").send(credentials);
};

/* ACTIVATION PHASE */
describe("Activation", () => {
  // Succces test cases
  it("returns 200 when email exist", async () => {
    const driver = await addDriverToDatabase();

    const response = await authenticateDriverEmail(driver.email);
    expect(response.status).toBe(200);
  });
  it("returns a message in body to indicate that driver is inactive when driver is inactive", async () => {
    const driver = await addDriverToDatabase();

    const response = await authenticateDriverEmail(driver.email);
    expect(response.body.isActivated).toBe(false);
  });
  it("returns 200 when driver is activated", async () => {
    const hash = await bcrypt.hash("123", 10);
    const driver = await addDriverToDatabase({
      email: validDriver.email,
      driverLicense: validDriver.driverLicense,
      activationToken: hash,
    });

    const response = await activateDriver({
      email: driver.email,
      activationToken: "123",
      password: "P4ssword",
    });

    expect(response.status).toBe(200);
  });
  it("returns appropriate response body when activated", async () => {
    const hash = await bcrypt.hash("123", 10);
    const driver = await addDriverToDatabase({
      email: validDriver.email,
      driverLicense: validDriver.driverLicense,
      activationToken: hash,
    });

    const response = await activateDriver({
      email: driver.email,
      activationToken: "123",
      password: "P4ssword",
    });

    const driverFromDB = await Driver.findOne({
      where: { email: driver.email },
    });

    expect(driverFromDB.isActivated).toBe(true);
    expect(driverFromDB.password).not.toBeNull();
    expect(response.body.message).toBe(msg.account_activation_success);
  });
  it("encrypts password of driver in the process of activation", async () => {
    const hash = await bcrypt.hash("123", 10);
    const driver = await addDriverToDatabase({
      email: validDriver.email,
      driverLicense: validDriver.driverLicense,
      activationToken: hash,
    });

    await activateDriver({
      email: driver.email,
      activationToken: "123",
      password: "P4ssword",
    });

    const driverFromDB = await Driver.findOne({
      where: { email: driver.email },
    });

    expect(driverFromDB.isActivated).toBe(true);
    expect(driverFromDB.password).not.toEqual("P4ssword");
  });
  it("clears activation token when driver is activated", async () => {
    const hash = await bcrypt.hash("123", 10);
    const driver = await addDriverToDatabase({
      email: validDriver.email,
      driverLicense: validDriver.driverLicense,
      activationToken: hash,
    });

    await activateDriver({
      email: driver.email,
      activationToken: "123",
      password: "P4ssword",
    });

    const driverFromDB = await Driver.findOne({
      where: { email: driver.email },
    });

    expect(driverFromDB.activationToken).toBe(null);
  });

  // error cases
  it("returns 401 authentication error if the email does not exist in the process of activation", async () => {
    const hash = await bcrypt.hash("123", 10);
    const driver = await addDriverToDatabase({
      email: validDriver.email,
      driverLicense: validDriver.driverLicense,
      activationToken: hash,
    });

    const response = await activateDriver({
      email: "user2@mail.com",
      activationToken: "123",
      password: "P4ssword",
    });

    expect(response.status).toBe(401);
  });

  it("returns 401 authentication error if activation token is not correct", async () => {
    const hash = await bcrypt.hash("123", 10);
    const driver = await addDriverToDatabase({
      email: validDriver.email,
      driverLicense: validDriver.driverLicense,
      activationToken: hash,
    });

    const response = await activateDriver({
      email: "user2@mail.com",
      activationToken: "234",
      password: "P4ssword",
    });

    expect(response.status).toBe(401);
  });

  it.each`
    field         | value              | expectedMessage
    ${"password"} | ${null}            | ${msg.password_null}
    ${"password"} | ${"P4ssw"}         | ${msg.password_size}
    ${"password"} | ${"alllowerCase"}  | ${msg.password_pattern}
    ${"password"} | ${"ALLUPPERCASE"}  | ${msg.password_pattern}
    ${"password"} | ${"1234567890"}    | ${msg.password_pattern}
    ${"password"} | ${"lowerandUPPER"} | ${msg.password_pattern}
    ${"password"} | ${"lower4nd5667"}  | ${msg.password_pattern}
    ${"password"} | ${"UPPER44444"}    | ${msg.password_pattern}
    ${"email"}    | ${"mail.com"}      | ${msg.authentication_failure}
    ${"email"}    | ${"user.mail.com"} | ${msg.authentication_failure}
    ${"email"}    | ${"user@mail"}     | ${msg.authentication_failure}
  `(
    "returns $expectedMessage when $field is $value",
    async ({ field, value, expectedMessage }) => {
      const hash = await bcrypt.hash("123", 10);
      const driver = await addDriverToDatabase({
        email: validDriver.email,
        driverLicense: validDriver.driverLicense,
        activationToken: hash,
      });

      const activationValues = {
        email: "user2@mail.com",
        activationToken: "234",
        password: "P4ssword",
      };

      activationValues[field] = value;

      const response = await activateDriver(activationValues);
      expect(response.body.validationErrors[field]).toBe(expectedMessage);
    }
  );
});

const postAuthentication = async (credentials) => {
  return await request(app).post("/api/1.0/auth/login").send(credentials);
};

/* AUTHENTICATION PHASE */
describe("Authentication", () => {
  // Authentication
  it("returns 200 OK when user is authenticated", async () => {
    const hash = await bcrypt.hash("P4ssword", 10);
    const driver = await addDriverToDatabase({
      email: validDriver.email,
      driverLicense: validDriver.driverLicense,
      activationToken: null,
      isActivated: true,
      password: hash,
    });

    const response = await postAuthentication({
      email: driver.email,
      password: "P4ssword",
    });

    expect(response.status).toBe(200);
  });
  it("returns authorization token in response when user is authenticated", async () => {
    const hash = await bcrypt.hash("P4ssword", 10);
    const driver = await addDriverToDatabase({
      email: validDriver.email,
      driverLicense: validDriver.driverLicense,
      activationToken: null,
      isActivated: true,
      password: hash,
    });

    const response = await postAuthentication({
      email: driver.email,
      password: "P4ssword",
    });

    expect(response.body.token).not.toBeUndefined();
  });
  it("returns driver email in response when user is authenticated", async () => {
    const hash = await bcrypt.hash("P4ssword", 10);
    const driver = await addDriverToDatabase({
      email: validDriver.email,
      driverLicense: validDriver.driverLicense,
      activationToken: null,
      isActivated: true,
      password: hash,
    });

    const response = await postAuthentication({
      email: driver.email,
      password: "P4ssword",
    });

    expect(response.body.email).toBe("user1@mail.com");
  });
});

const sendEmailForPasswordReset = async (credentials) => {
  return await request(app)
    .post("/api/1.0/auth/sendEmailForPasswordReset")
    .send(credentials);
};
/* SEND PASSWORD RESET EMAIL PHASE */
describe("Password Reset Token", () => {
  // Success cases
  it("returns 200 Ok when password reset email sending succeeded", async () => {
    const hash = await bcrypt.hash("P4ssword", 10);
    const driver = await addDriverToDatabase({
      email: validDriver.email,
      driverLicense: validDriver.driverLicense,
      activationToken: null,
      isActivated: true,
      password: hash,
    });

    const response = await sendEmailForPasswordReset({
      driverLicense: driver.driverLicense,
      email: driver.email,
    });
    expect(response.status).toBe(200);
  });
  it("stores password reset token in database of the particular driver", async () => {
    const hash = await bcrypt.hash("P4ssword", 10);
    const driver = await addDriverToDatabase({
      email: validDriver.email,
      driverLicense: validDriver.driverLicense,
      activationToken: null,
      isActivated: true,
      password: hash,
    });

    await sendEmailForPasswordReset({
      driverLicense: driver.driverLicense,
      email: driver.email,
    });

    const driverFromDB = await Driver.findOne({
      where: { email: driver.email },
    });

    expect(driverFromDB.passwordResetToken).not.toBeUndefined();
  });

  it("sends email containing the password reset token to driver's email", async () => {
    const hash = await bcrypt.hash("P4ssword", 10);
    const driver = await addDriverToDatabase({
      email: validDriver.email,
      driverLicense: validDriver.driverLicense,
      activationToken: null,
      isActivated: true,
      password: hash,
    });

    await sendEmailForPasswordReset({
      driverLicense: driver.driverLicense,
      email: driver.email,
    });

    expect(lastMail).toContain("user1@mail.com");
  });

  // Error cases
  it("returns 403 forbidden when user is inactive", async () => {
    const hash = await bcrypt.hash("P4ssword", 10);
    const driver = await addDriverToDatabase({
      email: validDriver.email,
      driverLicense: validDriver.driverLicense,
      activationToken: null,
      isActivated: false,
      password: hash,
    });

    const response = await sendEmailForPasswordReset({
      driverLicense: driver.driverLicense,
      email: driver.email,
    });
    expect(response.status).toBe(403);
  });
  it("returns 403 forbidden when the driver license is wrong", async () => {
    const hash = await bcrypt.hash("P4ssword", 10);
    const driver = await addDriverToDatabase({
      email: validDriver.email,
      driverLicense: validDriver.driverLicense,
      activationToken: null,
      isActivated: true,
      password: hash,
    });

    const response = await sendEmailForPasswordReset({
      driverLicense: "driver.driverLicense",
      email: driver.email,
    });
    expect(response.status).toBe(403);
  });
  it("returns a message when driver is inactive", async () => {
    const hash = await bcrypt.hash("P4ssword", 10);
    const driver = await addDriverToDatabase({
      email: validDriver.email,
      driverLicense: validDriver.driverLicense,
      activationToken: null,
      isActivated: false,
      password: hash,
    });

    const response = await sendEmailForPasswordReset({
      driverLicense: driver.driverLicense,
      email: driver.email,
    });
    expect(response.body.message).toBe(msg.inactive_authentication_failure);
  });
  it("returns a message when driver's license id is incorrect", async () => {
    const hash = await bcrypt.hash("P4ssword", 10);
    const driver = await addDriverToDatabase({
      email: validDriver.email,
      driverLicense: validDriver.driverLicense,
      activationToken: null,
      isActivated: true,
      password: hash,
    });

    const response = await sendEmailForPasswordReset({
      driverLicense: "driver.driverLicense",
      email: driver.email,
    });
    expect(response.body.message).toBe(msg.wrong_license_info);
  });
  it("returns 502 bad gateway when sending email fails", async () => {
    const hash = await bcrypt.hash("P4ssword", 10);
    const driver = await addDriverToDatabase({
      email: validDriver.email,
      driverLicense: validDriver.driverLicense,
      activationToken: null,
      isActivated: true,
      password: hash,
    });

    simulateSmtpFailure = true;

    const response = await sendEmailForPasswordReset({
      driverLicense: driver.driverLicense,
      email: driver.email,
    });
    expect(response.status).toBe(502);
  });
  it("returns email failure message when sending email fails", async () => {
    const hash = await bcrypt.hash("P4ssword", 10);
    const driver = await addDriverToDatabase({
      email: validDriver.email,
      driverLicense: validDriver.driverLicense,
      activationToken: null,
      isActivated: true,
      password: hash,
    });

    simulateSmtpFailure = true;

    const response = await sendEmailForPasswordReset({
      driverLicense: driver.driverLicense,
      email: driver.email,
    });

    const driverFromDB = await Driver.findOne({
      where: { email: driver.email },
    });
    expect(response.body.message).toBe(msg.email_failure);
  });
});

const resetPassword = async (resetDetails) => {
  return await request(app)
    .post("/api/1.0/auth/passwordReset")
    .send(resetDetails);
};
/* RESET PASSWORD PHASE */
describe("Password Reset", () => {
  it("returns 200 OK when password reset is done", async () => {
    const hash = await bcrypt.hash("P4ssword", 10);
    const hash2 = await bcrypt.hash("Microsoft@2021", 10);
    const driver = await addDriverToDatabase({
      email: validDriver.email,
      driverLicense: validDriver.driverLicense,
      activationToken: null,
      isActivated: true,
      password: hash,
      passwordResetToken: hash2,
    });

    const newPassword = "Microsoft@02021";
    const passwordResetToken = "Microsoft@2021";

    const response = await resetPassword({
      passwordResetToken,
      password: newPassword,
      email: driver.email,
    });

    expect(response.status).toBe(200);
  });

  it("updates the password with the new password in database", async () => {
    const hash = await bcrypt.hash("P4ssword", 10);
    const hash2 = await bcrypt.hash("Microsoft@2021", 10);
    const driver = await addDriverToDatabase({
      email: validDriver.email,
      driverLicense: validDriver.driverLicense,
      activationToken: null,
      isActivated: true,
      password: hash,
      passwordResetToken: hash2,
    });

    const newPassword = "Microsoft@02021";
    const passwordResetToken = "Microsoft@2021";

    await resetPassword({
      passwordResetToken,
      password: newPassword,
      email: driver.email,
    });

    const driverFromDB = await Driver.findOne({
      where: { email: driver.email },
    });

    const match = await bcrypt.compare(newPassword, driverFromDB.password);
    expect(match).toBe(true);
    expect(driverFromDB.password).not.toBe(newPassword);
  });
  it("removes the password reset token from the database", async () => {
    const hash = await bcrypt.hash("P4ssword", 10);
    const hash2 = await bcrypt.hash("Microsoft@2021", 10);
    const driver = await addDriverToDatabase({
      email: validDriver.email,
      driverLicense: validDriver.driverLicense,
      activationToken: null,
      isActivated: true,
      password: hash,
      passwordResetToken: hash2,
    });

    const newPassword = "Microsoft@02021";
    const passwordResetToken = "Microsoft@2021";

    await resetPassword({
      passwordResetToken,
      password: newPassword,
      email: driver.email,
    });

    const driverFromDB = await Driver.findOne({
      where: { email: driver.email },
    });

    expect(driverFromDB.passwordResetToken).toBeNull();
  });

  // error cases
  it("returns authentication error when password reset token is null", async () => {
    const hash = await bcrypt.hash("P4ssword", 10);
    const driver = await addDriverToDatabase({
      email: validDriver.email,
      driverLicense: validDriver.driverLicense,
      activationToken: null,
      isActivated: true,
      password: hash,
      passwordResetToken: null,
    });

    const newPassword = "Microsoft@02021";
    const passwordResetToken = "Microsoft@2021";

    const response = await resetPassword({
      passwordResetToken,
      password: newPassword,
      email: driver.email,
    });

    expect(response.body.message).toBe(msg.authentication_failure);
  });
});
