// Load dotenv to load environment variables
require("dotenv").config();

// Create an express app
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express(); 

// Get all versions
const v1 = require("./apiVersions/v1/v1");

// Add a helmet that takes care of most security issues
app.use(helmet());

// Add middleware to parse json
app.use(bodyParser.json());

// Set up cors
app.use(cors({
    origin: "*",
    methods: "GET,POST",
}));

// Log each url that is attempting to use api
app.use((req, res, next) => {
    //console.log(req.url);
    next();
});

// Function used as start to api
app.use("/api/v1", v1);

app.get("/", (req, res) => {
    res.send("Hello World");
});


module.exports = app;