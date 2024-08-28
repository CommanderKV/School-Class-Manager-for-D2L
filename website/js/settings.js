// Get values to be saved for d2l
const D2LUsername = document.getElementById('d2lUsername');
const D2LPassword = document.getElementById('d2lPassword');
const D2LURL = document.getElementById('d2lURL');

// Get values to be saved for the user
const username = document.getElementById('username');
const password = document.getElementById('password');
const confirmPassword = document.getElementById('confirmPassword');

// Get the functions for db connection
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
            let result = await fetch("http://kyler.visserfamily.ca:3000/api/v1/login/test", {
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
    window.location.href = "./login.html";
}

async function checkStatus(status) {
    switch (status) {
        case 403:
            console.error("Unauthorized Obtaing a new token");
            let token = await getToken();
            sessionStorage.setItem("token", JSON.stringify(
                {
                    token: token,
                    time: new Date().getTime()
                }
            ));
            break;

        case 404:
            console.error("Not found");
            break;

        case 401:
            console.error("Forbidden");
            break;

        default:
            console.error("Unknown error");
            break;
    }
}

async function getUserData() {
    // Fetch the data
    let data;
    do {
        data = await fetch("http://kyler.visserfamily.ca:3000/api/v1/users/userSettings", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "authorization": `Bearer ${JSON.parse(sessionStorage.getItem("token")).token}`
            }
        }).catch((error) => {
            console.error(error);
            return null;
        });

        // Check the status
        if (data.status != 200) {
            checkStatus(data.status);
            console.log(data.error);
        }
    } while (data.status == 403);

    // Get the data as json
    let dataJson = await data.json();

    // Return the data
    return dataJson.data;
}

async function saveData(data) {
    // Save the data
    let result = await fetch("http://kyler.visserfamily.ca:3000/api/v1/users/saveSettings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "authorization": `Bearer ${JSON.parse(sessionStorage.getItem("token")).token}`
        },
        body: JSON.stringify(data)
    }).catch((error) => {
        console.error(error, result);
        return null;
    });

    // Check the status
    if (result.status != 200) {
        checkStatus(result.status);
    }
}

// Get the values that have already been saved
async function setValues() {
    // Get the values from the db
    checkToken();
    let data = await getUserData();
    data = data[0];
    console.log(data);

    // Set the values for the user
    username.setAttribute("value", data.username);

    // Set the values for d2l
    D2LUsername.setAttribute("value", data.d2lEmail);
    D2LURL.setAttribute("value", data.d2lLink);

    // Set the password to a default value
    password.setAttribute("value", "********");
    D2LPassword.setAttribute("value", "********");
}

// Save the values to the db
function saveD2L() {
    // Get the data
    let data = {
        username: null,
        password: null,
        d2lEmail: D2LUsername.value,
        d2lPassword: D2LPassword.value,
        d2lLink: D2LURL.value
    };

    // Save the data
    saveData(data);
}

function saveUser() {
    // Get the data
    if (password.value != confirmPassword.value) {
        alert("Passwords do not match please try again");
        return;
    }

    let data = {
        username: username.value,
        password: password.value,
        d2lEmail: null,
        d2lPassword: null,
        d2lLink: null
    };

    // Save the data
    saveData(data);
}


// Set the values
setValues();