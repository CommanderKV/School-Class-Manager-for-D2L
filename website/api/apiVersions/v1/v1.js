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
    // Check if database connection is established
    if (!DB.isConnected()) {
        // Connect to the database
        DB.connect();
    }
    // Check if user is logging in
    if (req.url == "/login" || req.url == "/login/test") {
        next();
    } else if (req.url == "/users/register" || req.url == "/users/login" ) {
        next();

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

router.post("/login/test", async (req, res) => {
    // Get the token from the request
    const token = req.headers.authorization.split(" ")[1];

    // Get the apiKey from the request
    const verify = helper.verifyToken(token);

    // Check if the token is valid
    if (verify.success) {
        // Test login
        let user = await DB.getUser({ apiKey: verify.data.apiKey });
        if (user.length == 0) {
            return res.status(200).json({message: "No users found"});
        } else if (user.length > 1) {
            return res.status(200).json({message: "No user found"});
        }

        // Token passes all tests
        res.status(200).json({message: "Token is valid"});

    // Tokem is invalid
    } else {
        res.status(401).json({message: "Token is invalid"});
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