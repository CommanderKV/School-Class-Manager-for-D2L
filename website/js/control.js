// Get start update button
const startUpdateButton = document.getElementById("startUpdate");

// Get the clear button
const clear = document.getElementById("clearConsole");

// Get the logs container
const logs = document.getElementById("logs");
const logsContainer = document.querySelector("#logs > ol");

// Get the console header container
const consoleHeader = document.getElementById("consoleHeader");

let updating = false;

async function checkToken() {
    // Check if we have one already or need to get a new one
    if (sessionStorage.getItem("token")) {
        // Check if the token is older than 4 hours
        if (JSON.parse(sessionStorage.getItem("token")).time < new Date().getTime() - (4 * 60 * 60 * 1000)) {
            sessionStorage.setItem("token", JSON.stringify(
                {
                    token: await getToken(),
                    date: new Date().getTime()
                }
            ));
        
        // The token is set and not expired
        } else {
            // Test token
            let result = await fetch("http://localhost:3000/api/v1/login/test", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "authorization": `Bearer ${JSON.parse(sessionStorage.getItem("token")).token}`
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
            }

            // Reset the token if it is invalid
            if (resultJson.message != "Token is valid") {
                sessionStorage.setItem("token", JSON.stringify(
                    {
                        token: await getToken(),
                        date: new Date().getTime()
                    }
                ));
            }
        }
    
    // Token is not set
    } else {
        // Set token
        sessionStorage.setItem("token", JSON.stringify(
            {
                token: await getToken(),
                date: new Date().getTime()
            }
        ));
    }
}

async function getToken () {
    // Login
    let data = await fetch(
        "http://localhost:3000/api/v1/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify
        ({
            "username": "CommanderKV",
            "password": "admin",
        }),

    // Catch any errors
    }).catch((error) => {
        console.error(error);
        return null;
    });

    if (data.status != 200) {
        checkStatus(data.status);
        return null;
    }

    // Get the result as json
    let result = await data.json();

    // Return the token
    return result.token;
}

function checkStatus(status, resultJson) {
    switch (status) {
        case 403:
            sessionStorage.setItem("token", {
                time: Date.now(),
                token: getToken()
            });
            updateLogs("Token refreshed");
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
    logsContainer.appendChild(logElement);
}

// Function to deal with inital request
async function initalRequest() {
    // Check the token
    await checkToken();

    var result, resultJson;
    do {
        // Initiate the first call to the server
        result = await fetch("http://localhost:3000/api/v1/classes/update", {
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
    // Check the token
    checkToken();

    var result, resultJson;
    do {
        // Initiate call to server for status update
        result = await fetch("http://localhost:3000/api/v1/classes/update", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "authorization": `Bearer ${JSON.parse(sessionStorage.getItem("token")).token}`
            }
        })
        .catch((error) => {
            console.log(error);
            return false;
        });

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
        // Update the logs
        updateLogs(resultJson.error);

        // Update header
        consoleHeader.querySelector("#consoleStatus").innerHTML = resultJson.status;
        consoleHeader.querySelector("#consoleStatus").classList = "error";
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

    return resultJson.output.length;
}

// Function to start the update
async function startUpdate() {
    if (updating) {
        return;
    }
    updating = true;
    // Set the token in the session storage
    token = await getToken();

    // Change the status of the console header
    consoleHeader.querySelector("#consoleStatus").innerHTML = "Active";
    consoleHeader.querySelector("#consoleStatus").classList.add("active");

    // Check if the inital request is not successful
    if (!await initalRequest()) {
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

    // Start the loop
    let interval = setInterval(async () => {
        if (loopCounter == seconds) {
            // Check if the inital request is not successful
            lastOutputLength = await updateStatus(lastOutputLength);
            if (lastOutputLength == false) {
                exit = true;
                updating = false;
                clearInterval(interval);
                consoleHeader.querySelector("#consoleCountDown").classList.add("hidden");
                
                // Scroll to bottom of logs
                logs.scrollTo(0, logs.scrollHeight);
                return;
            }

            // Check if we need to add more to the logs
            if (!lastOutputLength) {
                clearInterval(interval);
                consoleHeader.querySelector("#consoleCountDown").classList.add("hidden");
                
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

