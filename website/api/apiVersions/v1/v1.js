// Create express
const express = require("express");

// Create router
const router = express.Router();

// Get the DB module
const DB = require("./DB");

// Get all routes
const users = require("./routes/users");
const classes = require("./routes/classes");

// Secuirity function to make sure user is logged in
router.use((req, res, next) => {
    // Check if user is logged in
    if (
        (req.headers.username && req.headers.password) ||
        (req.headers.apikey)
    ) {
        // API Key found
        if (req.headers.apikey) {
            DB.checkAPIKey(req.headers.apikey)
            .then((data) => {
                if (data) {
                    next();
                } else {
                    res.status(401).send("Unauthorized");
                }
            });
            return;
        }

        // Username and password found
        DB.checkIn(req.headers.username, req.headers.password)
        .then((data) => {
            if (data) {
                next();
            } else {
                res.status(401).send("Unauthorized");
            }
        });
    
    // Headers not found
    } else {
        res.status(401).send("Unauthorized");
    }
});

// Route incoming requests to the correct function
router.use("/users", users);
router.use("/classes", classes);

router.use("/login", (req, res) => {
    let username = req.headers.username;
    let password = req.headers.password;
    DB.checkIn(username, password).then((userData) => {
        if (userData) {
            res.status(200).json({
                "status": "success",
                "userID": userData.userID,
                "APIKey": userData.APIKey,
                "d2lUsername": userData.d2lEmail,
                "d2lPassword": userData.d2lPassword
            });

        } else {
            res.status(401).json({
                "status": "failed",
                "message": "Unauthorized"
            });
        }
    });
});

// Create a route to show all available functions
/* router.use("/", (req, res) => {
    res.status(200).json({
        "functions": {
            "users": {
                "GET": [
                    "/:username"
                ]
            },
            "classes": {
                "update": [
                    "/:userID"
                ]
            }
        }
    });
}); */

module.exports = router;