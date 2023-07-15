const Sequelize = require("sequelize");
const sequelize = require("../config/database");

const Model = Sequelize.Model;

class Token extends Model {}

Token.init(
  {
    driverId: {
      type: Sequelize.STRING,
    },
    token: {
      type: Sequelize.STRING,
    },
    lastUsedAt: {
      type: Sequelize.DATE,
    },
  },
  { sequelize, modelName: "token", timestamps: false }
);

module.exports = Token;