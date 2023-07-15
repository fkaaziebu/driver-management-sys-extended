const { randomString } = require("../shared/generator");
const Token = require("./Token");

const createToken = async (driver) => {
  // Generate a random 32 digit token
  const token = randomString(32);
  // Connect token to the driver creating it
  await Token.create({
    token,
    driverId: driver.id,
    lastUsedAt: new Date(),
  });
  // Return the token
  return token;
};

const deleteToken = async (token) => {
  // Find token with the authorization token sent from the frontend and delete
  await Token.destroy({ where: { token: token } });
};

const verify = async (token) => {
  // Find token with value of token
  const tokenInDB = await Token.findOne({
    where: {
      token: token,
    },
  });
  // Get the driverId and send to the function that called it
  const driverId = tokenInDB.driverId;
  return { id: driverId };
};

module.exports = { createToken, deleteToken, verify };
