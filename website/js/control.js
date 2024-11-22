// Get start update button
const startUpdateButton = document.getElementById("startUpdate");

// Get the clear button
const clear = document.getElementById("clearConsole");

// Get the logs container
const logs = document.getElementById("logs");
const logsContainer = document.querySelector("#logs > ol");

// Get the console header container
const consoleHeader = document.getElementById("consoleHeader");

// Define variables
let updating = false;
let eta = 3600000;
let updatedETA = Math.floor(eta/1000);

async function checkToken() {
    // Check if we have one already or need to get a new one
    if (sessionStorage.getItem("token")) {
        // Check if the token is older than 4 hours
        if (JSON.parse(sessionStorage.getItem("token")).date < new Date().getTime() - (4 * 60 * 60 * 1000)) {
            console.log("Token is older than 4 hours");
            window.location.href = "./login.html";
        
        // The token is set and not expired
        } else {
            // Test token
            let result = await fetch("https://kyler.visserfamily.ca:3000/api/v1/login/test", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "authorization": `Bearer: ${JSON.parse(sessionStorage.getItem("token")).token}`
                }
            }).catch((error) => {
                console.error(error);
                return null;
            });

            // Get the data
            let resultJson = await result.json();

            // Check response
            if (result.status != 200) {
                checkStatus(result.status, resultJson);
                return null;
            } else {
                console.log("Token is valid");
            }
        }
    
    // Token is not set
    } else {
        window.location.href = "./login.html";
    }
}

function checkStatus(status, resultJson) {
    switch (status) {
        case 403:
            checkToken();
            break;

        case 409: // Will be logged anyways
            break;

        case 401:
            updateLogs(`Error(${status}): ${resultJson.error ? resultJson.error : resultJson.message}`);
            consoleHeader.querySelector("#consoleStatus").innerHTML = "Error";
            consoleHeader.querySelector("#consoleStatus").classList = "error";
            break;
        
        default:
            // Update the logs
            updateLogs(`Error(${status}): ${resultJson.error ? resultJson.error : resultJson.message}`);

            // Update header
            consoleHeader.querySelector("#consoleStatus").innerHTML = "Error";
            consoleHeader.querySelector("#consoleStatus").classList = "error";
            break;
    }
}

// Function to update the logs
function updateLogs(log) {
    // Update the logs
    const logElement = document.createElement("li");
    logElement.innerText = log;
    const trimmedLog = log.trimStart();
    if (trimmedLog.toUpperCase().startsWith("[NOTICE]") || trimmedLog.toUpperCase().startsWith("[WARNING]")) {
        logElement.classList.add("okay");
    } else if (trimmedLog.toUpperCase().startsWith("[ERROR]")) {
        logElement.classList.add("bad");
    }
    logsContainer.appendChild(logElement);
}

// Function to deal with initial request
async function initialRequest() {
    // Check the token
    await checkToken();

    var result, resultJson;
    do {
        // Initiate the first call to the server
        result = await fetch("https://kyler.visserfamily.ca:3000/api/v1/classes/update", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "authorization": `Bearer ${JSON.parse(sessionStorage.getItem("token")).token}`
            },
        })
        .catch((error) => {
            console.error(error);
            return false;
        });
        
        // Get the result as json
        resultJson = await result.json();

        // Check the status of the result
        if (result.status != 200) {
            checkStatus(result.status, resultJson);
        }
    } while (result.status != 200 && (result.status != 409 && resultJson.message != "Update already in progress"));

    // Add a log to the logs container
    updateLogs(resultJson.message);
    return true;
}

// Function to deal with regular updates
async function updateStatus(lastOutputLength) {
    var result, resultJson;
    do {
        // Initiate call to server for status update
        result = await fetch("https://kyler.visserfamily.ca:3000/api/v1/classes/update", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "authorization": `Bearer ${JSON.parse(sessionStorage.getItem("token")).token}`
            }
        })
        .catch(async (error) => {
            // Retry 5 times
            for (let i = 0; i < 5; i++) {
                updateLogs("Error: Failed to connect to server. Retrying...");
                await new Promise(r => setTimeout(r, 5000));
                result = await fetch("https://kyler.visserfamily.ca:3000/api/v1/classes/update", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "authorization": `Bearer ${JSON.parse(sessionStorage.getItem("token")).token}`
                    }
                })
                .catch((error) => {
                    console.error(error);
                    return false;
                });
                if (result != false) {
                    break;
                }
            }
            if (result == false) {
                return false;
            }
        });
        
        if (result == false) {
            return false;
        }
        // Get the result as json
        resultJson = await result.json();

        // Check the status of the result
        if (result.status != 200) {
            checkStatus(result.status, resultJson);
            return false;
        }

    } while (result.status != 200);

    // Check if there is an error
    if (resultJson.status == "Failed" || resultJson.status == "Error") {

        if (resultJson.error == "User missing required data") {
            updateLogs("Missing required data for user. Visit the settings page to update your information.");
        
        } else {
            // Update the logs
            updateLogs(resultJson.error);
        }

        // Update header
        consoleHeader.querySelector("#consoleStatus").innerHTML = resultJson.status;
        consoleHeader.querySelector("#consoleStatus").classList = "error";
        updating = false;
        return false;

    } else if (resultJson.status == "Completed") {
        if (resultJson.output.length > lastOutputLength) {
            // Update the header
            consoleHeader.querySelector("#consoleStatus").innerHTML = resultJson.status;

            // Update the progress bar
            let progress = consoleHeader.querySelector("#progressBar");
            progress.value = resultJson.progress;
            progress.max = resultJson.steps;

            // Add the new logs to the logs container
            for (let i = lastOutputLength; i < resultJson.output.length; i++) {
                updateLogs(resultJson.output[i]);
            }
        }
        return false;
    }


    // Check if there are any new logs
    if (resultJson.output.length > lastOutputLength) {
        // Update the header
        consoleHeader.querySelector("#consoleStatus").innerHTML = resultJson.status;

        // Update the progress bar
        let progress = consoleHeader.querySelector("#progressBar");
        progress.value = resultJson.progress;
        progress.max = resultJson.steps;
        

        // Add the new logs to the logs container
        for (let i = lastOutputLength; i < resultJson.output.length; i++) {
            updateLogs(resultJson.output[i]);
        }
    }

    // Check if the eta has changed
    if (resultJson.ETA != eta) {
        eta = resultJson.ETA;
        updatedETA = Math.floor(eta / 1000);
        consoleHeader.querySelector("#consoleETAValue").innerHTML = `${Math.floor(updatedETA/60)}:${updatedETA % 60 < 10 ? "0" : ""}${updatedETA % 60}`;
    }

    // Return the length of the output
    return resultJson.output.length;
}

// Function to start the update
async function startUpdate() {
    if (updating) {
        return;
    }
    updating = true;

    // Change the status of the console header
    consoleHeader.querySelector("#consoleStatus").innerHTML = "Active";
    consoleHeader.querySelector("#consoleStatus").classList.add("active");

    // Check if the initial request is not successful
    if (!await initialRequest()) {
        return;
    }

    // Set vars for the loop
    let lastOutputLength = 0;
    let loopCounter = 0;
    let seconds = 5;
    let exit = false;

    // Scroll to bottom of logs
    logs.scrollTop = logs.scrollHeight;

    // Enable the "updating in: #" message
    consoleHeader.querySelector("#consoleCountDown").classList.remove("hidden");
    consoleHeader.querySelector("#consoleETA").classList.remove("hidden");

    // Start the loop
    let interval = setInterval(async () => {
        if (loopCounter == seconds) {
            // Check if the initial request is not successful
            lastOutputLength = await updateStatus(lastOutputLength);
            if (lastOutputLength == false) {
                exit = true;
                updating = false;
                clearInterval(interval);
                consoleHeader.querySelector("#consoleCountDown").classList.add("hidden");
                consoleHeader.querySelector("#consoleETA").classList.add("hidden");
                
                // Scroll to bottom of logs
                logs.scrollTo(0, logs.scrollHeight);
                return;
            }

            // Check if we need to add more to the logs
            if (!lastOutputLength) {
                clearInterval(interval);
                consoleHeader.querySelector("#consoleCountDown").classList.add("hidden");
                consoleHeader.querySelector("#consoleETA").classList.add("hidden");
                
                // Scroll to bottom of logs
                logs.scrollTo(0, logs.scrollHeight);
                return;
            }
            loopCounter = 0;
        }

        // Check if we need to exit
        if (!exit) {
            loopCounter++;
            consoleHeader.querySelector("#consoleCountDown").innerHTML = `Updating in: ${(seconds - loopCounter) + 1}`;
            
            // Update the ETA
            updatedETA -= 1
            consoleHeader.querySelector("#consoleETAValue").innerHTML = `${Math.floor(updatedETA/60)}:${updatedETA % 60 < 10 ? "0" : ""}${updatedETA % 60}`;
        }
        logs.scrollTo(0, logs.scrollHeight);
    }, 1000);

}

// Add event listener to the start update button
startUpdateButton.addEventListener('click', startUpdate);
clear.addEventListener('click', () => {
    logsContainer.innerHTML = "";
    consoleHeader.querySelector("span:nth-child(2)").innerHTML = "Inactive";
    consoleHeader.querySelector("span:nth-child(2)").classList = "";
});

