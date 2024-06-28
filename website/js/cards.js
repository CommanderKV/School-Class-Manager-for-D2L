// Select the card container
const cardContainers = document.querySelectorAll('div.cards');

// Select the options
const containers = document.querySelectorAll('.main-container');


async function checkToken() {
    if (sessionStorage.getItem("token")) {
        if (JSON.parse(sessionStorage.getItem("token")).time < new Date().getTime() - (4 * 60 * 60 * 1000)) {
            sessionStorage.setItem("token", JSON.stringify(
                {
                    token: await getToken(),
                    date: new Date().getTime()
                }
            ));
        }
    } else {
        sessionStorage.setItem("token", JSON.stringify(
            {
                token: await getToken(),
                date: new Date().getTime()
            }
        ));
    }
}

async function checkStatus(status) {
    switch (status) {
        case 403:
            console.error("Unauthorized");
            let token = await getToken();
            sessionStorage.setItem("token", JSON.stringify(
                {
                    token: token,
                    time: new Date().getTime()
                }
            ));
            console.log(sessionStorage.getItem("token").time);
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


// Create a card element for a course
function createCourseCard(name, code, overallGrade, term, closed, assignments) {
    function formatDateTime(dateTime) {
        const date = new Date(dateTime);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours() % 12 || 12).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
        return `${year}/${month}/${day} ${hours}:${minutes} ${ampm}`;
    }

    // Create the container
    const card = document.createElement("div");
    card.classList.add("card");
    card.classList.add("course-card");
    if (closed) {
        card.classList.add("closed");
    }

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
    detailsDiv.classList.add("col");
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

    // Create label if this course is closed
    if (closed) {
        const closedLabel = document.createElement("span");
        closedLabel.classList.add("closed-label");
        closedLabel.innerText = "Closed";
        detailsDiv.appendChild(closedLabel);
    }

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
    assignmentList.classList.add("card-body-list");
    body.appendChild(assignmentList);

    if (assignments.length == 0) {
        return card;
    }

    // Sort assignments by due date
    assignments.sort((a, b) => {
        const currentDate = new Date();
        const dueDateA = new Date(a.due);
        const dueDateB = new Date(b.due);

        if (dueDateA < currentDate && dueDateB < currentDate) {
            return 0;
        } else if (dueDateA < currentDate) {
            return 1;
        } else if (dueDateB < currentDate) {
            return -1;
        } else {
            return dueDateA - dueDateB;
        }
    });

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
        assignmentDetails.classList.add("card-body-details");
        assignmentDiv.appendChild(assignmentDetails);

        // Create the name
        const assignmentName = document.createElement("span");
        assignmentName.innerText = assignments[i].name;
        assignmentDetails.appendChild(assignmentName);

        // Create the due date
        const assignmentDue = document.createElement("span");
        assignmentDue.classList.add("due");
        assignmentDue.innerText = "Due: " + formatDateTime(assignments[i].dueDate);
        assignmentDetails.appendChild(assignmentDue);
    }

    
    
    // Return the card
    return card;
}

// Create a card element for an assignment
function createAssignmentCard(name, due, grade, className, courseCode, instructions, submissions, submissionURL) {
    // Function to format the date
    function formatDateTime(dateTime) {
        const date = new Date(dateTime);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours() % 12 || 12).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
        
        // Return formated date
        return `${year}/${month}/${day} ${hours}:${minutes} ${ampm}`;
    }

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
    detailsDiv.classList.add("col");
    detailsDiv.classList.add("small");
    headerDetails.appendChild(detailsDiv);

    // Create the course name
    const courseName = document.createElement("span");
    courseName.classList.add("course-name");
    courseName.innerText = className;
    detailsDiv.appendChild(courseName);

    // Create the course code
    const courseCodeText = document.createElement("span");
    courseCodeText.classList.add("course-code");
    courseCodeText.innerText = courseCode;
    detailsDiv.appendChild(courseCodeText);

    // Create the course grade
    const courseGrade = document.createElement("span");
    courseGrade.classList.add("course-grade");
    courseGrade.classList.add("good");
    courseGrade.innerText = grade + "%";
    detailsDiv.appendChild(courseGrade);

    // Create the assignment due date
    const courseTerm = document.createElement("span");
    courseTerm.innerText = `Due: ${formatDateTime(due)}`;
    headerDetails.appendChild(courseTerm);

    // Create the card body
    const body = document.createElement("div");
    body.classList.add("card-body");
    body.classList.add("no-scrollbar");
    card.appendChild(body);

    if (instructions != null) {
        // Create the instruction body
        const instructionsDiv = document.createElement("div");
        instructionsDiv.classList.add("instructions");
        body.appendChild(instructionsDiv);

        // Create the instructions Label
        const instructionsLabel = document.createElement("label");
        instructionsLabel.innerText = "Instructions";
        instructionsDiv.appendChild(instructionsLabel);

        // Create instructions content div
        const instructionsContent = document.createElement("div");
        instructionsContent.classList.add("instructions-content");
        instructionsContent.innerHTML = instructions;
        instructionsDiv.appendChild(instructionsContent);
    }

    // Check if we have at least one submission
    if (submissions == null) {
        return card;
    }
    if (submissions.length == 0) {
        return card;
    }

    // Create the submissions list
    const submissionList = document.createElement("ol");
    submissionList.classList.add("card-body-list");
    body.appendChild(submissionList);


    // Sort assignments by due date
    submissions.sort((a, b) => {
        const currentDate = new Date();
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);

        if (dateA < currentDate && dateB < currentDate) {
            return 0;
        } else if (dateA < currentDate) {
            return 1;
        } else if (dateB < currentDate) {
            return -1;
        } else {
            return dateA - dateB;
        }
    });

    // Create the submissions
    for (var i = 0; i < submissions.length; i++) {
        // Creat the submission container
        const submission = document.createElement("li");
        submissionList.appendChild(submission);

        // Create the link to the submission
        const submissionLink = document.createElement("a");
        submissionLink.href = submissionURL;
        submission.appendChild(submissionLink);

        // Creat the details div
        const submissionDiv = document.createElement("div");
        submissionDiv.classList.add("card-body-details");
        submissionLink.appendChild(submissionDiv);

        // Create a container
        const submissionDetails = document.createElement("div");
        submissionDetails.classList.add("row");
        submissionDetails.classList.add("space-between");
        submissionDiv.appendChild(submissionDetails);

        // Create the submission ID
        const submissionName = document.createElement("span");
        submissionName.innerText = `Submission ID: ${submissions[i].submissionID}`;
        submissionDetails.appendChild(submissionName);

        // Create submitted div
        const submitedDiv = document.createElement("div");
        submitedDiv.classList.add("submitted");
        submissionDetails.appendChild(submitedDiv);

        // Create the 'submitted' part
        const submitted = document.createElement("span");
        submitted.innerText = "Submitted: ";
        submitedDiv.appendChild(submitted);

        // Create the date it was submitted
        const submissionsDate = document.createElement("span");
        submissionsDate.classList.add("completed");
        submissionsDate.innerText = formatDateTime(submissions[i].date);
        submitedDiv.appendChild(submissionsDate);

        if (submissions[i].comment != null) {
            // Create the comment div
            const commentDiv = document.createElement("div");
            commentDiv.classList.add("comment");
            submissionDiv.appendChild(commentDiv);

            // Create the comment content div
            const commentContent = document.createElement("div");
            commentContent.classList.add("comment-content");
            commentContent.innerHTML = submissions[i].comment;
            commentDiv.appendChild(commentContent);
        
        }
    }
    
    // Return the card
    return card;
}

async function getAllData() {
    // Fetch the data
    let data = await fetch("http://localhost:3000/api/v1/classes/allData", {
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
        return null;
    }

    // Get the data as json
    let dataJson = await data.json();

    // Return the data
    return dataJson.data;
}

async function addCards(container) {
    // Check the token
    await checkToken();

    // Get all data
    let data = await getAllData();
    if (data == null) {
        return;
    }

    // Check the container
    console.log(`Adding cards to ${container.id}`)
    let cardHolder = container.querySelector(".cards");

    switch (container.id) {   
        case "courses":
            // Create the cards
            let courseCards = [];
            for (let i = 0; i < data.length; i++) {
                // Create the card
                courseCards.push(createCourseCard(
                    data[i].className,
                    data[i].courseCode,
                    data[i].overallGrade ? data[i].overallGrade : "N/A",
                    data[i].termShort,
                    data[i].closed,
                    data[i].assignments
                ));
            }

            // Remove the loading animation
            document.getElementById("loadingAnimation").remove();

            // Add the cards to the container
            for (let i = 0; i < courseCards.length; i++) {
                cardHolder.appendChild(courseCards[i]);
            }
            break;

        case "assignments":
            // Create the cards
            let assignmentCards = [];

            // Go through the classes
            for (let i = 0; i < data.length; i++) {
                // Go through the assignments
                for (let j = 0; j < data[i].assignments.length; j++) {
                    // Create the card
                    assignmentCards.push(createAssignmentCard(
                        data[i].assignments[j].name,
                        data[i].assignments[j].dueDate,
                        data[i].assignments[j].grade,
                        data[i].className,
                        data[i].courseCode,
                        data[i].assignments[j].instructions,
                        data[i].assignments[j].submissions,
                        data[i].assignments[j].submissionURL
                    ));
                }
            }

            // Remove the loading animation
            document.getElementById("loadingAnimation").remove();

            // Add the cards to the container
            for (let i = 0; i < assignmentCards.length; i++) {
                cardHolder.appendChild(assignmentCards[i]);
            }
            break;
    }
}

for (var i = 0; i < containers.length; i++) {
    addCards(containers[i]);
}

