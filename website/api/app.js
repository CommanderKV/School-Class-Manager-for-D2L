// Load dotenv to load environment variables
require("dotenv").config();

// Create an express app
const express = require("express");
const app = express(); 

// Get all versions
const v1 = require("./apiVersions/v1/v1");

// Log each url that is attempting to use api
app.use((req, res, next) => {
    //console.log(req.url);
    next();
});

// Function used as start to api
app.use("/api/v1", v1);


module.exports = app;