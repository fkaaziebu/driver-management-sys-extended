'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class driver extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  driver.init({
    email: DataTypes.STRING,
    driverLicense: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'driver',
  });
  return driver;
};