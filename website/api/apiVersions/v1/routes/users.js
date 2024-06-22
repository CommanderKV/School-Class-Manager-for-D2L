// Get express
const express = require("express");

// Get router
const router = express.Router();

// Get the DB module
const DB = require("../DB");

// --------------------------------
//   Functions to handle requests
// --------------------------------

// Get user data
router.get("/:username", (req, res) => {
    // Get the username from the request
    const username = req.params.username;

    // Get the user data
    DB.getUser(username, (err, data) => {
        if (err) {
            res.status(500).send("An error occurred while getting the user data");
            return;
        }
        res.send(data);
    });
});

module.exports = router;