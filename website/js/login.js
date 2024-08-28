const loginButton = document.getElementById("login");

async function verifyLogin() {
    // Get the elements
    var username = document.getElementById("username").value;
    var password = document.getElementById("password").value;

    // Hash the password
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
    
    password = await hashValue(password);
    
    // Prepare the data to send
    var data = {
        username: username,
        password: password
    };
    

    // Send the data to the server
    let response = await fetch("http://localhost:3000/api/v1/users/login", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            "Content-Type": "application/json"
        }
    });
    
    // Check the response
    if (response.status == 200) {
        await response.json().then((data) => {
            const token = data.token;
            sessionStorage.setItem("token", JSON.stringify({
                token: token,
                date: new Date().getTime()
                })
            );

            window.location.href = "./courses.html";
        });
    
    // User is not in the system
    } else {
        await response.json().then((data) => {
            alert("Wrong username or password");
        });
    }
}