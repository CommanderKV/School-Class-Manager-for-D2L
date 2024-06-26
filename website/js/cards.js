// Select the card container
const cardContainers = document.querySelectorAll('div.cards');

// Select the options
const buttons = document.querySelectorAll('.option-buttons > button');
const containers = document.querySelectorAll('.main-container');
const pageTitle = document.querySelector('#pageTitle');


// Create a card element
function createCard(id) {
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
    label.innerText = `Doc Automation Course ${id}`;
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
    courseCode.innerText = "COMP-1112G-WAB";
    detailsDiv.appendChild(courseCode);

    // Create the course grade
    const courseGrade = document.createElement("span");
    courseGrade.classList.add("course-grade");
    courseGrade.classList.add("good");
    courseGrade.innerText = "100%";
    detailsDiv.appendChild(courseGrade);

    // Create the course term
    const courseTerm = document.createElement("span");
    courseTerm.classList.add("course-term");
    courseTerm.innerText = "2024W";
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

    // Creat the assignments
    for (var i = 0; i < 10; i++) {
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
        assignmentName.innerText = "Assignment 1: Work on this";
        assignmentDetails.appendChild(assignmentName);

        // Create the due date
        const assignmentDue = document.createElement("span");
        assignmentDue.innerText = "Due: 2024:01:01 00:00:00";
        assignmentDetails.appendChild(assignmentDue);
    }
    
    // Return the card
    return card;
}


// Go through each container and add cards
for (var i = 0; i < cardContainers.length; i++) {
    // Add a hundred cards to the container for testing
    for (var j=0; j < 100; j++) {
        cardContainers[i].appendChild(createCard(j));
    }
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