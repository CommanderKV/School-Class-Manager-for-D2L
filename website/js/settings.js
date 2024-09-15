// Get values to be saved for d2l
const D2LUsername = document.getElementById('d2lUsername');
const D2LPassword = document.getElementById('d2lPassword');
const D2LURL = document.getElementById('d2lURL');
const D2LForm = document.getElementById('d2lForm');

// Get values to be saved for the user
const username = document.getElementById('username');
const password = document.getElementById('password');
const confirmPassword = document.getElementById('confirmPassword');
const userForm = document.getElementById('accountForm');

// Encryption functions
async function encryptData(key, data, iv) {
    const encodedData = new TextEncoder().encode(data);
    const encryptedData = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        encodedData
    );
    return encryptedData;
}

function arrayBufferToBase64(buffer) {
    var binary = "";
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

async function generateKey() {
    return crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );
}

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
            let result = await fetch("https://kyler.visserfamily.ca:3000/api/v1/login/test", {
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
            console.error("Unauthorized Obtaining a new token");
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
        data = await fetch("https://kyler.visserfamily.ca:3000/api/v1/users/userSettings", {
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
    let result = await fetch("https://kyler.visserfamily.ca:3000/api/v1/users/saveSettings", {
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
    username.setAttribute("value", data.username ? data.username : "");

    // Set the values for d2l
    D2LUsername.setAttribute("value", data.d2lEmail ? data.d2lEmail : "");
    D2LURL.setAttribute("value", data.d2lLink ? data.d2lLink : "");

    // Set the password to a default value
    password.setAttribute("value", "********");
    D2LPassword.setAttribute("value", "********");
}

// Save the values to the db
async function saveD2L() {
    if (D2LPassword.value == "********") {
        alert("Please enter a new password");
        return;
    }

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

async function saveUser() {
    const hashValue = val =>
        crypto.subtle
            .digest('SHA-256', new TextEncoder('utf-8').encode(val))
            .then(h => {
                let hexes = [],
                    view = new DataView(h);
                for (let i = 0; i < view.byteLength; i += 4)
                    hexes.push(('00000000' + view.getUint32(i).toString(16)).slice(-8));
                return hexes.join('');
            }
        );

    // Get the data
    if (password.value != confirmPassword.value) {
        alert("Passwords do not match please try again");
        return;
    } else if (password.value == "********") {
        alert("Please enter a new password");
        return;
    }

    var pass = await hashValue(password.value);
    
    let data = {
        username: username.value,
        password: pass,
        d2lEmail: null,
        d2lPassword: null,
        d2lLink: null,
    };

    // Save the data
    saveData(data);
}


// Set the values
setValues();

// Add the event listeners
D2LForm.addEventListener("submit", (e) => {
    e.preventDefault();
    saveD2L();
});

userForm.addEventListener("submit", (e) => {
    e.preventDefault();
    saveUser();
});