// Get jwt for token verification
const jwt = require('jsonwebtoken');

// Get the secret for the server
const SECRET = process.env.JWT_SECRET;
if (SECRET.length == 0) {
    console.error("No JWT secret set");
    let generatedSecret = require('crypto').randomBytes(1024).toString('hex');
    console.error(`Generated secret: ${generatedSecret}`);
}

// Generate token
function generateToken(user) {
    // Get payload that can be used in other functions
    const payload = {
        apiKey: user.APIKey,
        userID: user.userID,
        username: user.username,
    };

    // Get the servers token
    const options = {
        expiresIn: "4h"
    }

    // Generate the token
    return jwt.sign(payload, SECRET, options);
}

// Verifies the token
function verifyToken(token) {
    // Verify the token
    try {
        // Decode the token
        const decoded = jwt.verify(token, SECRET);
        
        // Return the decoded data
        return { success: true, data: decoded };

    // Return an error if the token is invalid
    } catch (error) {
        // Return the error
        return { success: false, error: error.message };
    }
}

// Authenticate a token
function authenticateToken(req, res, next) {
    // Get authorization headers
    console.log(req.headers);
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    // Check if the token is set
    if (!token || token == null || token == "" || token == undefined) {
        // Unauthorized
        res.status(401).json({ "error": "No token set" });
        return;
    }
    console.log("Token set: " + token);

    // Get the result of verifying the token
    const result = verifyToken(token);

    // Check if the token is valid
    if (!result.success) {
        // If not valid, return an error
        console.log(`Token authentification error. ${result.error} Token: ${token == null ? "null" : token}`);
        res.status(403).json({ "error": result.error });
        return;
    }

    // If vaild set the user to the data in the token
    req.user = result.data;
    next();
}


// Used to check the parameters of a function and make
// Sure they are all set when all arguments are optional
function checkParams(params, minSet=null, recursion=false) {
    // Set a counter for how many parameters are set
    let set = 0;

    // Go through each parameter 
    for (let i = 0; i < params.length; i++) {
        // Check if the parameter is set
        if (params[i] != null && params[i] != undefined) {
            // Check if the parameter is a list
            if (Array.isArray(params[i]) && !recursion) {
                // Check if all elements in the list are set
                if (checkParams(params[i], params[i].length, true)) {
                    set++;
                }
            } else {
                // Increment the set counter
                set++;
            }
            
        }
    }

    // Check if the minimum number of parameters are set
    if (minSet != null) {
        // Return if we have more than or equal to the minimum number of parameters set
        return set >= minSet;

    } else {
        // Return if we have any parameters set
        return set > 0;
    }
}

// Makes an SQL query based on the parameters
function makeQuery(baseQuery, queryParamsRaw, refrenceParams, join=", ", end=";", defineCols=false) {
    // Add the base query to the query
    let query = baseQuery;
    let queryParams = [];

    // console.log(baseQuery, join, end, queryParamsRaw, refrenceParams, defineCols);

    // Add the columns to the query
    if (defineCols) {
        // Add the start of the query
        query += "(";

        // Go through and add the columns
        for (let i = 0; i < refrenceParams.length; i++) {
            // Add a column if its value is not null
            if (refrenceParams[i] != null && queryParamsRaw[i] != null) {
                query += refrenceParams[i] + join;
            }
        }

        // Add the end of the query
        query = query.slice(0, -join.length);
        query += ") VALUES (";
    }

    // Go throgugh the parameters
    let params = 0;
    for (let i = 0; i < queryParamsRaw.length; i++) {
        // If the parameter is not null
        if (queryParamsRaw[i] != null && refrenceParams[i] != null) {
            if (defineCols) {
                // Add the parameter to the query
                query += "?" + join;
                queryParams.push(queryParamsRaw[i]);
                params++;
                
            } else {
                // Add the parameter to the query
                query += `${refrenceParams[i]} = ?` + join;
                queryParams.push(queryParamsRaw[i]);
                params++;
            }
        }
    }
    
    if (params == 0) {
        // Return null if no parameters are set
        return [null, `No pramaters were set: ${queryParamsRaw} AND ${refrenceParams}`];
    }
    
    // Remove the last comma and space
    query = query.slice(0, -join.length);
    query += end;

    // Return the query and the query parameters
    return [query, queryParams];
}

module.exports = {
    checkParams,
    makeQuery,
    verifyToken,
    generateToken,
    authenticateToken
};