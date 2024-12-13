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
let failedAttemptsAtStart = 0;
let updatedStartedAt = new Date();

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
                updateLogs("[Error] Failed to verify token. Please try again.");
                return false;
            });

            if (!result) {
                return false;
            }

            // Get the data
            let resultJson = await result.json();

            // Check response
            if (result.status != 200) {
                checkStatus(result.status, resultJson);
                return null;
            } else {
                console.log("Token is valid");
                return true;
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

// Function to deal with regular updates
async function updateStatus(lastOutputLength, get=true) {
    var result, resultJson;
    for (let i=0; i<5; i++) {
        // Initiate call to server for status update
        result = await fetch("https://kyler.visserfamily.ca:3000/api/v1/classes/update", {
            method: get ? "GET" : "POST",
            headers: {
                "Content-Type": "application/json",
                "authorization": `Bearer ${JSON.parse(sessionStorage.getItem("token")).token}`
            }
        }).catch((error) => {
            console.error(error);
            return false;
        });

        // Check if the result had an error
        if (result != false) {
            break;
        }

        // If the result is false something is wrong try again
        if (i < 4) {
            updateLogs("Failed to get update. Retrying...");
        } else {
            updateLogs("Failed to get update. Check connection and try again later.");
        }
    }
    
    // Check if the result is not set
    if (result == false) {
        return -1;
    }
    
    // Get the result as json
    resultJson = await result.json();

    // If this is the initial request then add the message to the logs
    if (Object.keys(resultJson).length == 3) {
        if (result.status == 200 || result.status == 409) {
            updateLogs(resultJson.message);
            updatedStartedAt = resultJson.time;
        } else {
            checkStatus(result.status, resultJson);
        }
        return 0;
    }

    // Check the status of the result
    if (result.status != 200) {
        checkStatus(result.status, resultJson);
        return -1;
    }

    // If the script was told to close by the server try accessing it again
    if (resultJson.started != updatedStartedAt) {
        return lastOutputLength;
    }


    /////////////////////
    // Update the logs //
    /////////////////////
    // Update the header
    consoleHeader.querySelector("#consoleStatus").innerHTML = resultJson.status;

    // Update the progress bar
    let progress = consoleHeader.querySelector("#progressBar");
    progress.value = resultJson.progress;
    progress.max = resultJson.steps;

    // Update logs
    if (resultJson.output.length > lastOutputLength) {
        for (let i = lastOutputLength; i < resultJson.output.length; i++) {
            updateLogs(resultJson.output[i]);
        }
    }

    /////////////////
    // Error check //
    /////////////////
    // Check if there is an error
    if (resultJson.status == "Failed" || resultJson.status == "Error") {

        // Update header
        consoleHeader.querySelector("#consoleStatus").classList = "error";
        updating = false;

        // Check errors
        if (resultJson.error == "User missing required data") {
            updateLogs("Missing required data for user. Visit the settings page to update your information.");
        
        } else {
            updateLogs(`[Error] Failed on Step ${resultJson.progress} / ${resultJson.steps} Try again later.`);
        }

        return false;
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
    if (!await checkToken() || await updateStatus(0, false) == -1) {
        // If the user has tried at least 3 times to start an update and failed
        // There is likely an issue with the server or their internet connection
        if (failedAttemptsAtStart >= 3) {
            updateLogs("[Error] Failed to start update. Please try again later.");

        // Let user know something failed and have them try again
        } else {
            updating = false;
            updateLogs("[Error] Failed to start update. Please try again.");
            failedAttemptsAtStart++;
        }

        // Exit execution
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
        // Check if we need to exit
        if (!exit) {
            if (loopCounter == seconds) {
                loopCounter = seconds*2;
                // Check if the initial request is not successful
                lastOutputLength = await updateStatus(lastOutputLength);
                if (lastOutputLength === false || lastOutputLength === -1) {
                    exit = true;
                    updating = false;
                    clearInterval(interval);
                    consoleHeader.querySelector("#consoleCountDown").classList.add("hidden");
                    consoleHeader.querySelector("#consoleETA").classList.add("hidden");
                    consoleHeader.querySelector("#consoleStatus").innerHTML = "Failed";
                    
                    // Scroll to bottom of logs
                    logs.scrollTo(0, logs.scrollHeight);
                    return;
                }
                loopCounter = 0;

            // Check to update counters
            } else if (loopCounter <= seconds) {
                // Update the countdown
                loopCounter++;
                consoleHeader.querySelector("#consoleCountDown").innerHTML = `Updating in: ${(seconds - loopCounter) + 1}`;
                
                // Update the ETA
                updatedETA -= 1
                consoleHeader.querySelector("#consoleETAValue").innerHTML = `${Math.floor(updatedETA/60)}:${updatedETA % 60 < 10 ? "0" : ""}${updatedETA % 60}`;
            
            // Check if we are over the time limit
            // This would indicate the connection is 
            // trying to reconnect or something is wrong
            } else {
                consoleHeader.querySelector("#consoleCountDown").classList.add("hidden");
                consoleHeader.querySelector("#consoleETA").classList.add("hidden");
                consoleHeader.querySelector("#consoleStatus").innerHTML = "Trouble shooting";
            }
        } else {
            clearInterval(interval);
        }
    }, 1000);

}

// Add event listener to the start update button
startUpdateButton.addEventListener('click', startUpdate);
clear.addEventListener('click', () => {
    logsContainer.innerHTML = "";
    consoleHeader.querySelector("span:nth-child(2)").innerHTML = "Inactive";
    consoleHeader.querySelector("span:nth-child(2)").classList = "";
});

