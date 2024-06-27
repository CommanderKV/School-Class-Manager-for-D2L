// Select the card container
const cardContainers = document.querySelectorAll('div.cards');

// Select the options
const buttons = document.querySelectorAll('.option-buttons > button');
const containers = document.querySelectorAll('.main-container');
const pageTitle = document.querySelector('#pageTitle');


async function checkToken() {
    if (window.token == null) {
        window.token = await getToken();
    }
}

async function checkStatus(status) {
    switch (status) {
        case 403:
            console.error("Unauthorized");
            window.token = await getToken();
            console.log(window.token);
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

// Get the token
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


// Create a card element
function createCourseCard(name, code, overallGrade, term, assignments) {
    /*  <div class="card">
            <div class="card-header">
                <!-- Image here? -->
                <label>Doc Automation Using Python</label>
                <div class="card-header-details">
                    <div>
                        <span class="course-code">COMP-1112G-WAB</span>
                        <span class="course-grade good">100%</span>
                    </div>
                    <span class="course-term">2024W</span>
                </div>
            </div>
            <div class="card-body no-scrollbar">
                <ol id="card-assignment-list">
                    <li>
                        <div>
                            <!-- Dynamically add svg? -->
                            <div class="card-assignment-details">
                                <span>Assignment 1: Work on this</span>
                                <span>Due: 2024-01-01</span>
                            </div>
                        </div>
                    </li>
                    <li>
                        <div>
                            <!-- Dynamically add svg? -->
                            <div class="card-assignment-details">
                                <span>Assignment 1: Work on this</span>
                                <span>Due: 2024-01-01</span>
                            </div>
                        </div>
                    </li>
                    <li>
                        <div>
                            <!-- Dynamically add svg? -->
                            <div class="card-assignment-details">
                                <span>Assignment 1: Work on this</span>
                                <span>Due: 2024-01-01</span>
                            </div>
                        </div>
                    </li>
                    <li>
                        <div>
                            <!-- Dynamically add svg? -->
                            <div class="card-assignment-details">
                                <span>Assignment 1: Work on this scroll</span>
                                <span>Due: 2024-01-01</span>
                            </div>
                        </div>
                    </li>
                    <li>
                        <div>
                            <!-- Dynamically add svg? -->
                            <div class="card-assignment-details">
                                <span>Assignment 1: Work on this scroll</span>
                                <span>Due: 2024-01-01</span>
                            </div>
                        </div>
                    </li>
                </ol>
            </div>
        </div> */

    // Create the container
    const card = document.createElement("div");
    card.classList.add("card");

    // Create the header
    const header = document.createElement("div");
    header.classList.add("card-header");
    card.appendChild(header);

    // Create the label
    const label = document.createElement("label");
    label.innerText = name;
    header.appendChild(label);

    // Create the header details
    const headerDetails = document.createElement("div");
    headerDetails.classList.add("card-header-details");
    header.appendChild(headerDetails);

    // Create the details div
    const detailsDiv = document.createElement("div");
    headerDetails.appendChild(detailsDiv);

    // Create the course code
    const courseCode = document.createElement("span");
    courseCode.classList.add("course-code");
    courseCode.innerText = code;
    detailsDiv.appendChild(courseCode);

    // Create the course grade
    const courseGrade = document.createElement("span");
    courseGrade.classList.add("course-grade");
    courseGrade.classList.add("good");
    courseGrade.innerText = overallGrade + "%";
    detailsDiv.appendChild(courseGrade);

    // Create the course term
    const courseTerm = document.createElement("span");
    courseTerm.classList.add("course-term");
    courseTerm.innerText = term;
    headerDetails.appendChild(courseTerm);

    // Create the card body
    const body = document.createElement("div");
    body.classList.add("card-body");
    body.classList.add("no-scrollbar");
    card.appendChild(body);

    // Create the assignment list
    const assignmentList = document.createElement("ol");
    assignmentList.id = "card-assignment-list";
    body.appendChild(assignmentList);

    if (assignments.length == 0) {
        return card;
    }

    // Creat the assignments
    for (var i = 0; i < assignments.length; i++) {
        // Creat the container
        const assignment = document.createElement("li");
        assignmentList.appendChild(assignment);

        // Create the assignment div
        const assignmentDiv = document.createElement("div");
        assignment.appendChild(assignmentDiv);

        // Creat the details div
        const assignmentDetails = document.createElement("div");
        assignmentDetails.classList.add("card-assignment-details");
        assignmentDiv.appendChild(assignmentDetails);

        // Create the name
        const assignmentName = document.createElement("span");
        assignmentName.innerText = assignments[i].name;
        assignmentDetails.appendChild(assignmentName);

        // Create the due date
        const assignmentDue = document.createElement("span");
        assignmentDue.innerText = "Due: " + assignments[i].due;
        assignmentDetails.appendChild(assignmentDue);
    }
    
    // Return the card
    return card;
}

async function addCards(container) {
    // Check for vaild login
    await checkToken();

    // Check if the containers ID is one of the following
    console.log(`Adding cards to ${container.id}`)
    let cardHolder = container.querySelector(".cards");
    switch (container.id) {
        case "courses":
            // Get the courses
            const courseResult = await fetch("http://localhost:3000/api/v1/classes", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "authorization": `Bearer ${window.token}`
                }
            }).catch((error) => {
                console.error(error);
                return null;
            });

            if (courseResult.status != 200) {
                checkStatus(courseResult.status);
                return;
            }

            console.log(`Courses: ${courseResult}`)

            // Get the result as json
            const courseResultJson = await courseResult.json();
            console.log(courseResultJson)

            let cards = [];
            // Create a card for each course 
            for (let i = 0; i < courseResultJson.courses.length; i++) {
                // Get the assignments for this course
                const assignmentResult = await fetch(`http://localhost:3000/api/v1/classes/assignments/${courseResultJson.courses[i].classID}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "authorization": `Bearer ${window.token}`
                    }
                }).catch((error) => {
                    console.error(error);
                    return null;
                });

                // Check if data exsists
                if (assignmentResult.status != 200) {
                    checkStatus(assignmentResult.status);
                    continue;
                } else if (assignmentResult == null || assignmentResult == undefined) {
                    console.log("No assignments found");
                    continue;
                }

                // Get the result as json
                const assignmentsJson = await assignmentResult.json();

                // Check if the assignments are empty
                /*if (assignmentsJson.assignments.length == 0) {
                    cards.push(createCourseCard(
                        courseResultJson.courses[i].name,
                        courseResultJson.courses[i].courseCode,
                        courseResultJson.courses[i].overallGrade ? courseResultJson.courses[i].overallGrade : "N/A",
                        courseResultJson.courses[i].termShort,
                        []
                    ));
                    continue;
                }*/
               console.log(assignmentsJson.assignments)

                // Add cards
                let assignments = [];
                for (let j = 0; j < assignmentsJson.assignments.length; j++) {
                    assignments.push({
                        name: assignmentsJson.assignments[j].name,
                        due: assignmentsJson.assignments[j].dueDate
                    });
                }

                // Create the card
                const data = createCourseCard(
                    courseResultJson.courses[i].name,
                    courseResultJson.courses[i].courseCode,
                    courseResultJson.courses[i].overallGrade ? courseResultJson.courses[i].overallGrade : "N/A",
                    courseResultJson.courses[i].termShort,
                    assignments
                )

                // Add the card to the container
                cards.push(data);
                
                delete data;
                delete assignments;
                delete assignmentsJson;
                delete assignmentResult;
            }

            // Add the cards to the container
            for (let i = 0; i < cards.length; i++) {
                cardHolder.appendChild(cards[i]);
            }

            break;
        
        case "assignments":

            break;
    }
}

for (var i = 0; i < containers.length; i++) {
    addCards(containers[i]);
}

// Add event listeners to the buttons
for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', function() {
        // Get the text of this button
        const text = this.innerHTML;

        // Set the title of the page
        pageTitle.innerText = "My " + text;

        // Remove the selected class from all other main-containers
        for (var j = 0; j < containers.length; j++) {
            containers[j].classList.remove('selected');
        }

        // Get the container with the ID of the text
        const container = document.getElementById(text.replace(" ", "-").toLowerCase());
        container.classList.add('selected');

        // Remove the active class from all other buttons
        for (var j = 0; j < buttons.length; j++) {
            buttons[j].classList.remove('active');
        }
        // Add the active class to the clicked button
        this.classList.add('active');
    });
}