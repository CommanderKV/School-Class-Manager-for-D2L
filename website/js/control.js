// Get start update button
const startUpdateButton = document.getElementById("startUpdate");

// Get the clear button
const clear = document.getElementById("clearConsole");

// Get the logs container
const logs = document.getElementById("logs");
const logsContainer = document.querySelector("#logs > ol");

// Get the console header container
const consoleHeader = document.getElementById("consoleHeader");

if (window.token == null) {
    window.token = getToken();
}

async function getToken () {
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
    }).catch((error) => {
        console.error(error);
        return null;
    });

    let result = await data.json();
    return result.token;
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
    // Initiate the first call to the server
    let result = await fetch("http://localhost:3000/api/v1/classes/update", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "authorization": "Bearer " + window.token
        },
    })
    .catch((error) => {
        console.error(error);
        return false;
    });
    
    // Get the result as json
    let resultJson = await result.json();

    // Check the status of the result
    if (result.status != 200) {
        switch (result.status) {
            case 403:
                token = getToken();
                updateLogs("Token refreshed");
                break;

            case 409:
                updateLogs(resultJson.message);
                return true;
            
            case 401:
                updateLogs(`Error(${resultJson.status}): ${resultJson.error ? resultJson.error : resultJson.message}`);
                consoleHeader.querySelector("#consoleStatus").innerHTML = "Error";
                consoleHeader.querySelector("#consoleStatus").classList = "error";
                return false;
        }

        // Update the logs
        updateLogs(`Error(${result.status}): ${resultJson.error ? resultJson.error : resultJson.message}`);

        // Update header
        consoleHeader.querySelector("#consoleStatus").innerHTML = "Error";
        consoleHeader.querySelector("#consoleStatus").classList = "error";

        return false;
    }

    // Add a log to the logs container
    updateLogs(resultJson.message);
    return true;
}

// Function to deal with regular updates
async function updateStatus(lastOutputLength) {
    // Initiate call to server for status update
    let result = await fetch("http://localhost:3000/api/v1/classes/update", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "authorization": "Bearer " + window.token
        }
    })
    .catch((error) => {
        console.log(error);
        return false;
    });

    // Get the result as json
    let resultJson = await result.json();

    // Check the status of the result
    if (result.status != 200) {
        // Update the logs
        updateLogs(`Error(${result.status}): ${resultJson.error ? resultJson.error : resultJson.message}`);

        // Update header
        consoleHeader.querySelector("#consoleStatus").innerHTML = resultJson.status;
        consoleHeader.querySelector("#consoleStatus").classList = "error";

        return false;
    
    // Check if there is an error
    } else if (resultJson.status == "Failed" || resultJson.status == "Error") {
        // Update the logs
        updateLogs(resultJson.message);

        // Update header
        consoleHeader.querySelector("#consoleStatus").innerHTML = resultJson.status;
        consoleHeader.querySelector("#consoleStatus").classList = "error";
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
    let lastOutputLength = await updateStatus(0);
    let loopCounter = 0;
    let seconds = 5;

    // Scroll to bottom of logs
    logs.scrollTop = logs.scrollHeight;

    // Enable the "updating in: #" message
    consoleHeader.querySelector("#consoleCountDown").classList.remove("hidden");

    // Start the loop
    let interval = setInterval(async () => {
        if (loopCounter == seconds) {
            // Check if the inital request is not successful
            lastOutputLength = await updateStatus(lastOutputLength);
            if (!lastOutputLength) {
                clearInterval(interval);
                consoleHeader.querySelector("#consoleCountDown").classList.add("hidden");
                
                // Scroll to bottom of logs
                logs.scrollTop = logs.scrollHeight;
                return;
            }
            loopCounter = 0;
        }
        loopCounter++;
        consoleHeader.querySelector("#consoleCountDown").innerHTML = `Updating in: ${(seconds - loopCounter) + 1}`;
    }, 1000);

}

// Add event listener to the start update button
startUpdateButton.addEventListener('click', startUpdate);
clear.addEventListener('click', () => {
    logsContainer.innerHTML = "";
    consoleHeader.querySelector("span:nth-child(2)").innerHTML = "Inactive";
    consoleHeader.querySelector("span:nth-child(2)").classList = "";
});

