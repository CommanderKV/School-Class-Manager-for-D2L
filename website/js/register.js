const register = document.getElementById("register");

async function registerUser() {
    var email = document.getElementById("email").value;
    var username = document.getElementById("username").value;
    var password = document.getElementById("password").value;
    
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

    var data = {
        email: email || null,
        username: username,
        password: password,
    };

    let response = await fetch("https://kyler.visserfamily.ca:3000/api/v1/users/register", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            "Content-Type": "application/json"
        }
    });
    
    if (response.status == 200) {
        await response.json().then((data) => {
            console.log(data.token);
            localStorage.setItem("token", JSON.stringify({
                token: data.token,
                date: new Date().getTime()
                })
            );
            window.location.href = "./login.html";
        });
    } else {
        await response.json().then((data) => {
            alert("Wrong username or password" + data.error);
        });
    }
    
}

register.addEventListener("submit", (event) => {
    event.preventDefault();
    console.log("Register form submitting");
    registerUser();
});