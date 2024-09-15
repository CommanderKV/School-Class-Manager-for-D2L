// Load dotenv to load environment variables
require("dotenv").config();

// Get http module
const https = require("https");

// Get fs module
const fs = require("fs");

// Define the port to listen on
const port = process.env.PORT || 3000;

// Get the app
const app = require("./app");

// Make server to listen on a port
const options = {
    key: fs.readFileSync(process.env.SSL_KEY),
    cert: fs.readFileSync(process.env.SSL_CERT)
};

const server = https.createServer(options, app);

server.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on ${JSON.stringify(server.address())}`);
});