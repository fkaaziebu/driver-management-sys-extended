const nodemailer = require("nodemailer");
const transporter = require("../config/emailTransporter");
const config = require("config");

const sendDriverActivationToken = async (email, password) => {
  const info = await transporter.sendMail({
    ...config.get("mailConfig"),
    to: email,
    subject: "DMS Activation Token",
    html: `
    <div>
      <h1>Your DMS activation token</h1>
    </div>
    <div>
      Token is ${password}
    </div>
    `,
  });
  if (process.env.NODE_ENV === "development") {
    console.log("url: " + nodemailer.getTestMessageUrl(info));
  }
};

module.exports = { sendDriverActivationToken };
