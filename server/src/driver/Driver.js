const Sequelize = require("sequelize");
const sequelize = require("../config/database");
const Token = require("../auth/Token");

const Model = Sequelize.Model;

class Driver extends Model {}

/*
Driver Class has two inputs for initialization
1. Object for attributes
2. Object for options
*/

Driver.init(
  {
    email: {
      type: Sequelize.STRING,
    },
    driverLicense: {
      type: Sequelize.STRING,
    },
    activationToken: {
      type: Sequelize.STRING,
    },
    isActivated: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    password: {
      type: Sequelize.STRING,
    },
    passwordResetToken: {
      type: Sequelize.STRING,
    },
  },
  { sequelize, modelName: "driver" }
);

Driver.hasMany(Token, { onDelete: "cascade", foreignKey: "driverId" });
Token.belongsTo(Driver, { onDelete: "cascade", foreignKey: "driverId" });

module.exports = Driver;
