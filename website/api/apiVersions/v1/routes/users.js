// Get express
const express = require("express");

// Get router
const router = express.Router();

// Get the DB module
const DB = require("../DB");

// Get the helper module
const helper = require("../helper");

// --------------------------------
//   Functions to handle requests
// --------------------------------

// Get all user settings
router.get("/userSettings", (req, res) => {
    // Get data out of token
    const token = req.headers.authorization.split(" ")[1];
    const data = helper.verifyToken(token);
    
    // Check if the token is valid
    if (!data.success) {
        res.status(403).json({ "error": data.error });
        return;
    }

    // Get the userID
    const userID = data.data.userID;

    // Get the user settings
    DB.getUserSettings(userID).then((data) => {
        res.status(200).json({ "data": data });
    }).catch((error) => {
        console.log(error);
        res.status(500).json({ "error": error });
    });
});

// Save the user settings
router.post("/saveSettings", (req, res) => {
    // Get data out of token
    const token = req.headers.authorization.split(" ")[1];
    const data = helper.verifyToken(token);
    
    // Check if the token is valid
    if (!data.success) {
        res.status(403).json({ "error": data.error });
        return;
    }

    // Get the userID
    const userID = data.data.userID;

    // Save the settings
    DB.saveUserSettings(userID, req.body).then(() => {
        res.status(200).json({ "message": "Settings saved" });
    }).catch((error) => {
        res.status(500).json({ "error": error });
    });
});

module.exports = router;