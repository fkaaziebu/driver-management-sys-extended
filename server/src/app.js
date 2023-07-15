const express = require("express");
const cors = require("cors");
const ErrorHandler = require("../src/error/ErrorHandler");
const DriverRouter = require("./driver/DriverRouter");
const DriverAuthenticationRouter = require("./auth/DriverAuthenticationRouter");

const app = express();

app.use(cors());
app.use(express.json({ limit: "3mb" }));
// All routes for driver operations
app.use(DriverRouter);
app.use(DriverAuthenticationRouter);
// Middleware for handling errors passed using the next function
app.use(ErrorHandler);

module.exports = app;
