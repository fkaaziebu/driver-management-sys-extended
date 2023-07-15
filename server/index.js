const app = require("./src/app");
const sequelize = require("./src/config/database");

sequelize.sync();

app.listen(7000, () => {
  console.log(
    "app is running: version " + process.env.npm_package_version
  );
});