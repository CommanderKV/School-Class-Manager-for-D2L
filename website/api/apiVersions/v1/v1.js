// Create express
const express = require("express");

// Create router
const router = express.Router();

// Get the DB module
const DB = require("./DB");

// Get the helper module
const helper = require("./helper");

// Get all routes
const users = require("./routes/users");
const classes = require("./routes/classes");

// Secuirity function to make sure user is logged in
router.use((req, res, next) => {
    // Check if user is logging in
    if (req.url == "/login") {
        next();
        return;

    // Check if user is logged in
    } else {
        helper.authenticateToken(req, res, next);
    }
});

// Route incoming requests to the correct function
router.use("/users", users);
router.use("/classes", classes);

// Log user in
router.post("/login", async (req, res) => {
    // Get the username and password from the request
    const bodyUsername = req.body["username"];
    const bodyPassword = req.body["password"];

    try {
        // Get user from database
        let user = await DB.getUser({
            username: bodyUsername, 
            password: bodyPassword
        });
        
        if (!user || user.length == 0) {
            return res.status(401).json({message: "No users found"});
        }

        // Go through all users and find the correct one
        for (let i = 0; i < user.length; i++) {
            if (user[i].password == bodyPassword) {
                user = user[i];
                break;
            }
        }
        if (Array.isArray(user)) {
            return res.status(401).send({message: "Invalid credentials"});
        }
        
        // User is authenticated. Create a JWT token
        const token = helper.generateToken(user);

        // Send the token to the user
        res.status(200).json({ token });
    
    // If there is an error, send a 500 error
    } catch (error) {
        console.error(error);
        res.status(500).json({message: `Server error contact admin. Error: ${error.message}`});
    }
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