const request = require("supertest");
const app = require("../src/app");
const Driver = require("../src/driver/Driver");
const sequelize = require("../src/config/database");
const config = require("config");
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
  await Driver.destroy({ truncate: { cascade: true } });
});

afterAll(async () => {
  await server.close();
  jest.setTimeout(5000);
});

// Valid driver details
validDriver = {
  email: "user1@mail.com",
  driverLicense: "GHB4355ioiFDFCV",
};

// Send driver details to create driver
const postDriver = (driver = validDriver) => {
  return request(app).post("/api/1.0/drivers").send(driver);
};

describe("Driver Registration", () => {
  it("returns 200 OK when signup request is valid", async () => {
    const response = await postDriver();
    expect(response.status).toBe(200);
  });
  it("returns success message when signup request is valid", async () => {
    const response = await postDriver();
    expect(response.body.message).toBe(msg.driver_create_success);
  });
  it("saves the driver to database", async () => {
    await postDriver();
    const driverList = await Driver.findAll();
    expect(driverList.length).toBe(1);
  });
  it("generate activation token on driver creation", async () => {
    await postDriver();
    const driverList = await Driver.findAll();
    const driver = driverList[0];
    expect(driver.activationToken).not.toBeNull();
    expect(driver.isActivated).toBe(false);
  });
  it("sends an email containing activationToken created when driver was created", async () => {
    await postDriver();
    expect(lastMail).toContain("user1@mail.com");
  });
  it.each`
    field              | value              | expectedMessage
    ${"email"}         | ${null}            | ${msg.email_null}
    ${"email"}         | ${"mail.com"}      | ${msg.email_invalid}
    ${"email"}         | ${"user.mail.com"} | ${msg.email_invalid}
    ${"email"}         | ${"user@mail"}     | ${msg.email_invalid}
    ${"driverLicense"} | ${null}            | ${msg.driverLicense_null}
  `(
    "returns $expectedMessage when $field is $value",
    async ({ field, value, expectedMessage }) => {
      const driver = {
        email: "user1@mail.com",
        driverLicense: "GHB4355ioiFDFCV",
      };

      driver[field] = value;
      const response = await postDriver(driver);
      const body = response.body;
      expect(body.validationErrors[field]).toBe(expectedMessage);
    }
  );
  it(`returns ${msg.email_inuse} when same email in use`, async () => {
    await Driver.create({ ...validDriver });
    const response = await postDriver();

    expect(response.body.validationErrors.email).toBe(msg.email_inuse);
  });
  it("returns errors for both email in use and driverLicense is null", async () => {
    await Driver.create({ ...validDriver });
    const response = await postDriver({
      email: validDriver.email,
      driverLicense: null,
    });

    console.log(response.body.validationErrors);

    expect(Object.keys(response.body.validationErrors)).toEqual([
      "email",
      "driverLicense",
    ]);
  });
});

/* ERROR MODEL */
describe("Error Model", () => {
  it("returns path, timestamp, message and validationErrors in response when validation failure", async () => {
    const response = await postDriver({ ...validDriver, driverLicense: "" });
    expect(Object.keys(response.body)).toEqual([
      "path",
      "timestamp",
      "message",
      "validationErrors",
    ]);
  });
  it("returns path in error body", async () => {
    const response = await postDriver({ ...validDriver, driverLicense: "" });
    expect(response.body.path).toBe("/api/1.0/drivers");
  });
  it("returns timestamp in milliseconds within 5 seconds value in error body", async () => {
    const nowInMillis = new Date().getTime();
    const fiveSecondsLater = nowInMillis + 5 * 1000;
    const response = await postDriver({ ...validDriver, driverLicense: "" });

    expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
    expect(response.body.timestamp).toBeLessThan(fiveSecondsLater);
  });
});
