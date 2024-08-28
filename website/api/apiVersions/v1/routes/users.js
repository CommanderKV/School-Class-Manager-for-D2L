// Get express
const express = require("express");

// Get the crypto module
const crypto = require("crypto");

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


// Login the user
router.post("/login", (req, res) => {
    // Get the data
    const data = req.body;

    // Check if the data is valid
    if (!data.username || !data.password) {
        res.status(400).json({ "error": "Invalid data" });
        return;
    }

    // Convert the password to sha256
    let password = data.password; //crypto.createHash("sha256").update(data.password).digest("hex");

    console.log(password, data.username);

    // Get the user
    DB.getUser({username: data.username, password: password}).then((data) => {
        // Check if the user exists
        if (data.length == 0) {
            res.status(404).json({ "error": "User not found" });
            console.log("User not found", data, data.username, password);
            return;
        }

        // Create the token
        const token = helper.generateToken(data[0]);

        // Send the token
        console.log("token: " + token);
        res.status(200).json({ "token": token });
    }).catch((error) => {
        console.log(error);
        res.status(500).json({ "error": error });
    });
});

// Register the user
router.post("/register", (req, res) => {
    // Get the data
    const data = req.body;

    // Check if the data is valid
    if (!data.password || !data.username) {
        res.status(400).json({ "error": "Invalid data" });
        return;
    }

    // Convert the password to sha256
    let password = data.password; //crypto.createHash("sha256").update(data.password).digest("hex");

    // Create the user
    DB.createUser({email: data.email, password: password, username: data.username}).then((user) => {
        res.status(200).json(
            { 
                "message": "User created",
                "token": helper.generateToken(user)
            }
        );
    }).catch((error) => {
        console.log(error);
        res.status(500).json({ "error": error });
    });
});

module.exports = router;