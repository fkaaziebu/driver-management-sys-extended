const Sequelize = require("sequelize");
const config = require("config");

const dbConfig = config.get("database");

/* 
The sequelize instance takes some few arguments for the
the database config:

1. Name for database
2. Name of user
3. Password for database connection
4. Object for providing optional arguments
*/

const sequelize = new Sequelize(
    dbConfig.dbname,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      port: dbConfig.port,
      dialect: dbConfig.dialect,
      storage: dbConfig.storage,
      logging: dbConfig.logging,
    }
  );
  
  module.exports = sequelize;