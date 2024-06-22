// Load dotenv to load environment variables
require("dotenv").config();

// Get http module
const http = require("http");

// Define the port to listen on
const port = process.env.PORT || 3000;

// Get the app
const app = require("./app");

// Make server to listen on a port
const server = http.createServer(app);

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});