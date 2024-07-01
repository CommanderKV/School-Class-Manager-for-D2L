// Get mysql module
const mysql = require("mysql2");

// Create a connection to the database
const connection = mysql.createConnection({ 
    host: process.env.DB_HOST,
    port: process.env.DB_PORT, 
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true
});

connection.addListener("error", (error) => {
    console.log("An error occoured with the database Link: " + error + " Code: " + error.code);
    if (error.code === "PROTOCOL_CONNECTION_LOST") {
        console.error("Database connection was closed. Atttempting reconnect.");
        connection.end();
        connection.connect();
    
    // If we timed or cant connect out attempt reconnect up to 5 times then error and exit
    } else if (error.code == "ETIMEDOUT" || error.code == "ENOTFOUND") {
        // Set interval for 5 seconds
        let counter = 1;
        setInterval(async () => {
            // Check if we ahve tried for 5 times
            if (counter == 5) {
                clearInterval();
                return;
            
            // If we havent exceeded our 5 attempts try again
            } else {
                // If we are not connected attempt connect
                if (!isConnected()) {
                    await connect();
                
                // If we are connected exit loop
                } else {
                    clearInterval();
                    return;
                }
                counter++;
            }
        }, 5000)
    }
});

// Connect to the database
connect();

function isConnected() {
    return connection.ping((error) => {
        if (error) {
            return false;
        }
        return true;
    });
}

async function connect() {
    await connection.connect((error) => {
        if (error) {
            console.error(`An error occurred while connecting to the database. ${error}`);
            return;
        }
        console.log("Connected to the database");
    });
}

// --------------------
//   Helper functions
// --------------------
const helper = require("./helper");


// --------------------
//   Update functions
// --------------------
function updateCourse(course, userID) {
    return new Promise((resolve, reject) => {
        // Check that the parameters are given
        if (!helper.checkParams([course, userID])) {
            reject(`updateCourse: No arguments provided. ${course}, ${userID}`);
        }

        // Course does not exsit
        getClass({ courseCode: course.CODE, link: course.LINK, name: course.NAME})
        .then((data) => {
            if (data.length === 0) {
                // Make the query
                let [query, queryParams] = helper.makeQuery(
                    `INSERT INTO Classes `,
                    [
                        course.CLOSED, 
                        course.LINK, 
                        course.NAME, 
                        course.CODE, 
                        course.TERMS.SHORT, 
                        course.TERMS.LONG
                    ],
                    [
                        "closed",
                        "link",
                        "name",
                        "courseCode",
                        "termShort",
                        "termLong"
                    ],
                    ", ",
                    `); 
                    SELECT LAST_INSERT_ID() as classID;
                    INSERT INTO UsersToClasses (classID, userID) VALUES (LAST_INSERT_ID(), ?);
                    `,
                    true
                );
                queryParams.push(userID);

                connection.query(query, queryParams, (error, results, fields) => {
                    if (error) {
                        reject(`An error occurred while adding the course: ${error} Query: ${query} Params: ${queryParams}`);
                    }
                    console.log(JSON.stringify(results));
                    resolve(results[0].classID);
                });

            // Course does exist
            } else {
                // Get the first class that was returned (Should not be more than one class returned)
                data = data[0];

                // Check if an update is needed
                if (
                    data.closed != course.CLOSED || 
                    data.link != course.LINK || 
                    data.name != course.NAME || 
                    data.termShort != course.TERMS.SHORT || 
                    data.termLong != course.TERMS.LONG
                ) {
                    // Update the course
                    let [query, queryParams] = helper.makeQuery(
                        `UPDATE Courses SET `,
                        [
                            course.CLOSED,
                            course.LINK,
                            course.NAME,
                            course.TERMS.SHORT,
                            course.TERMS.LONG
                        ],
                        [
                            "closed",
                            "link",
                            "\`name\`",
                            "termShort",
                            "termLong"
                        ],
                        ", ",
                        ` WHERE courseID = ?;`,
                        false
                    );
                    queryParams.push(data.courseID);

                    // Execute the query
                    connection.query(query, queryParams, (error, results, fields) => {
                        if (error) {
                            reject(`An error occurred while updating the course. ${error}`);
                            return;
                        }
                        resolve(data.classID);
                    });
                }
                resolve(data.classID);
            }
        }).catch((error) => {
            reject(`An error occurred while getting the course. ${error}`)  
        });
    });
}

function updateAssignment({
    link=null,
    name=null,
    due=null,
    instructions=null,
    grade=null,
    weight=null,
    courseID=null,
    submissionURL=null,
    userID=null
    }) {
    return new Promise((resolve, reject) => {
        // Check that the parameters are given
        if (!helper.checkParams([
            link, 
            name, 
            due, 
            instructions, 
            grade,
            weight,
            courseID, 
            submissionURL,
            userID
        ])) {
            reject(`updateAssignment: No arguments provided. ${link}, ${name}, ${due}, ${instructions}, ${grade}, ${weight} ${courseID}, ${submissionURL}`);
        }

        if (courseID == null) {
            reject("updateAssignment: No course ID provided");
        }


        // Check if assignment exists already
        getAssignment({
            link: link, 
            name: name, 
            dueDate: due, 
            instructions: instructions,
            submissionURL: submissionURL, 
            classID: courseID
        }).then((data) => {
            // Assignment does not exist
            if (data == null || data.length === 0) {
                // Create the query
                let [query, queryParams] = helper.makeQuery(
                    `INSERT INTO Assignments `,
                    [
                        link,
                        submissionURL,
                        name,
                        due,
                        instructions,
                        courseID
                    ],
                    [
                        "link",
                        "submissionURL",
                        "name",
                        "dueDate",
                        "instructions",
                        "classID"
                    ],
                    ", ",
                    "); SELECT LAST_INSERT_ID() as assignmentID;",
                    true,
                );

                // Insert the assignment into the database
                connection.query(query, queryParams, (error, results, fields) => {
                    // Something went wrong while adding the assignment
                    if (error) {
                        reject(`An error occurred while adding the assignment.\n\t[QUERY] "${query}" ${error} CourseID: ${courseID}`);
                    
                    // Assignment was added successfully
                    } else {
                        // Insert the grade
                        updateGrade({ 
                            grade: grade, 
                            weight: weight, 
                            classID: courseID, 
                            assignmentID: results[0].assignmentID, 
                            userID: userID
                        }).catch((error) => {
                            reject(`An error occurred while adding the grade. ${error}`);
                        });
                        resolve(results[0].assignmentID);
                    }
                });

            // Assignment does exist
            } else {
                // Get the first class that was returned (Should not be more than one class returned)
                data = data[0];

                // Check if an update is needed
                if (
                    data.link != link || 
                    data.submissionURL != submissionURL ||
                    data.name != name || 
                    data.dueDate != due ||
                    data.instructions != instructions
                ) {

                    // Update the assignment
                    let [query, queryParams] = helper.makeQuery(
                        `UPDATE Assignments SET `,
                        [
                            link != data.link ? link : null,
                            submissionURL != data.submissionURL ? submissionURL : null,
                            name != data.name ? name : null,
                            due != data.dueDate ? due : null,
                            instructions != data.instructions ? instructions : null,
                        ],
                        [
                            "link",
                            "submissionURL",
                            "name",
                            "dueDate",
                            "instructions",
                        ],
                        ", ",
                        " WHERE assignmentID = ?;"
                    );
                    queryParams.push(data.assignmentID);
                    
                    connection.query(query, queryParams, (error, results, fields) => {
                        if (error) {
                            reject(`An error occurred while updating the assignment. ${error}`);
                        } else {
                            resolve(data.assignmentID);
                        }
                    });
                } else {
                    resolve(data.assignmentID);
                }
            }
        })
        .catch((error) => {
            reject(`An error occurred while getting the assignment. ${error} ${error.stack}`);
        });
    });
}

function updateAttachment({ attachmentID=null, assignmentID=null, submissionID=null, link=null, size=null, name=null }) {
    // Both IDS cannot be null
    if (!helper.checkParams([assignmentID, submissionID])) {
        return new Promise((resolve, reject) => {
            reject(`updateAttachment: No assignment or submission ID provided`);
        });
    }

    // Update the attachment
    return new Promise((resolve, reject) => {
        // Make the query
        let [query, queryParams] = helper.makeQuery(
            `SELECT * FROM Attachments WHERE `,
            [attachmentID, link, size, name],
            ["attachmentID", "link", "size", "name"],
            " AND "
        );

        // Check if attachment exists already
        connection.query(query, queryParams, (error, results, fields) => {
            if (error) {
                reject(`An error occurred while getting the attachment. ${error}`);
                return;
            }

            // Attachment does not exist
            if (results.length === 0) {
                // Insert the attachment into the database
                let query, queryParams;
                if (attachmentID != null && assignmentID != null) {
                    [query, queryParams] = helper.makeQuery(
                        `INSERT INTO Attachments `,
                        [link, size, name],
                        ["link", "size", "name"],
                        ", ",
                        `); 
                        INSERT INTO AttachmentLinkToAssignment (attachmentID, assignmentID) VALUES (
                            LAST_INSERT_ID(), 
                            ?
                        );
                        `,
                        true
                    );
                    queryParams.push(assignmentID);

                } else if (attachmentID != null && submissionID != null) {
                    [query, queryParams] = helper.makeQuery(
                        `INSERT INTO Attachments `,
                        [link, size, name],
                        ["link", "size", "name"],
                        ", ",
                        `);
                        INSERT INTO AttachmentLinkToSubmission (attachmentID, submissionID) VALUES (
                            LAST_INSERT_ID(),
                            ?
                        );
                        `,
                        true
                    );
                    queryParams.push(submissionID);
                    
                } else {
                    reject("updateAttachment: No assignment or submission ID provided");
                }
                if (query == null || queryParams == null) {
                    reject("updateAttachment: Query failed");
                }

                console.log(query, queryParams, attachmentID, assignmentID, submissionID, link, size, name);
                connection.query(query, queryParams, (error, results, fields) => {
                    if (error) {
                        reject(`An error occurred while adding or linking the attachment. ${error} Query: ${query} Params: ${queryParams}`);
                        return;
                    }

                    resolve(true);
                }).catch((error) => {
                    reject(`An error occurred while adding the attachment. ${error}`);  
                });

            // Attachment does exist
            } else {
                // Check if an update is needed
                if (
                    results[0].name != name ||
                    results[0].link != link || 
                    results[0].size != size
                ) {
                    // Update the attachment
                    let [query, queryParams] = helper.makeQuery(
                        `UPDATE Attachments SET `,
                        [
                            link != results[0].link ? link : null, 
                            size != results[0].size ? size : null, 
                            name != results[0].name ? name : null
                        ],
                        ["link", "size", "name"],
                        ", ",
                        " WHERE attachmentID = ?;"
                    );
                    
                    queryParams.push(results[0].attachmentID);
                    connection.query(query, queryParams, (error, results, fields) => {
                        if (error) {
                            reject(`An error occurred while updating the attachment. ${error}`);
                            return;
                        }
                        resolve(true);
                    });
                } else {
                    resolve(true);
                }
            }
        });
    });
}

function updateSubmission({submissionID=null, assignmentID=null, comment=null, d2lSubmissionID=null, date=null}) {
    return new Promise((resolve, reject) => {
        // Check for parameters
        if (!helper.checkParams([submissionID, assignmentID, comment, d2lSubmissionID, date])) {
            reject(`updateSubmission: No arguments provided ${submissionID}, ${assignmentID}, ${comment}, ${d2lSubmissionID}, ${date}`);
        }

        if (submissionID == null && assignmentID == null) {
            reject("updateSubmission: No submission or assignment ID provided");
        } else if (submissionID != null && assignmentID != null) {
            reject("updateSubmission: Both submission and assignment ID provided");
        } if (date == null) {
            reject("updateSubmission: No date provided");
        }

        // Check if submission exists already
        let [query, queryParams] = helper.makeQuery(
            `SELECT * FROM Submissions WHERE `,
            [submissionID, assignmentID, comment, d2lSubmissionID, date],
            ["submissionID", "assignmentID", "comment", "d2lSubmissionID", "date"],
            " AND "
        );
        connection.query(query, queryParams, (error, results, fields) => {
            if (error) {
                reject(`An error occurred while getting the submission. ${error}`);
                return;
            }

            // Submission does not exist
            if (results.length === 0) {
                // Insert the submission into the database
                let [query, queryParams] = helper.makeQuery(
                    `INSERT INTO Submissions `,
                    [assignmentID, comment, date, d2lSubmissionID],
                    ["assignmentID", "comment", "date", "d2lSubmissionID"],
                    ", ",
                    "); SELECT LAST_INSERT_ID() as submissionID;",
                    true
                );
                connection.query(query, queryParams, (error, results, fields) => {
                    if (error) {
                        reject(`An error occurred while adding the submission. ${error}`);
                        return;
                    }
                    
                    // Return the submission ID
                    resolve(results[0].submissionID);
                });

            // Submission does exist
            } else {
                // Check if an update is needed
                if (
                    results[0].d2lSubmissionID != d2lSubmissionID || 
                    results[0].comment != comment || 
                    results[0].date != date
                ) {
                    // Update the submission
                    let [query, queryParams] = helper.makeQuery(
                        `UPDATE Submissions SET `,
                        [
                            assignmentID != results[0].assignmentID ? assignmentID : null, 
                            comment != results[0].comment ? comment : null, 
                            date != results[0].date ? date : null, 
                            d2lSsubmissionID != results[0].d2lSubmissionID ? d2lSubmissionID : null
                        ],
                        ["assignmentID", "comment", "date", "d2lSubmissionID"],
                        ", ",
                        " WHERE submissionID = ?;",
                    );
                    queryParams.push(results[0].submissionID);

                    connection.query(query, queryParams, (error, results2, fields) => {
                        if (error) {
                            reject(`An error occurred while updating the submission. ${error}`);
                            return;
                        }
                        if (results2.length === 0) {
                            resolve(null);
                        }

                        resolve(results[0].submissionID);
                    });
                } else {
                    resolve(results[0].submissionID);
                }
            }
        });
    });
}

function updateGrade({ grade=null, weight=null, classID=null, assignmentID=null, userID=null }) {
    // Check if the parameters are provided
    if (!helper.checkParams([grade, assignmentID, userID], 3)) {
        return new Promise((resolve, reject) => {
            reject(`updateGrade: No arguments provided. ${grade}, ${assignmentID}, ${userID}`);
        });
    }

    // Make the query
    let query, queryParams;
    if (classID == null) {
        query = `
        SELECT 
            Grades.grade,
            Grades.weight
        FROM Grades
        LEFT JOIN GradesLinkToAssignments ON Grades.gradeID = GradesLinkToAssignments.gradeID
        LEFT JOIN Users ON Grades.userID = Users.userID
        WHERE 
            Grades.UserID = ? AND 
            GradesLinkToAssignments.assignmentID = ?
        GROUP BY Grades.gradeID;
        `;
        queryParams = [userID, assignmentID];
    
    // Grades also has a class
    } else {
        query = `
        SELECT 
            Grades.grade,
            Grades.weight
            Grades.gradeID
        FROM Grades
        LEFT JOIN GradesLinkToAssignments ON 
            Grades.gradeID = GradesLinkToAssignments.gradeID
        LEFT JOIN GradesAssignmentsLinkToClasses ON
            GradesAssignmentsLinkToClasses.assignmentID = GradesLinkToAssignments.assignmentID
        LEFT JOIN Users ON Grades.userID = Users.userID
        WHERE 
            Grades.UserID = ? AND 
            GradesLinkToAssignments.assignmentID = ? AND
            GradesAssignmentsLinkToClasses.classID = ?
        GROUP BY Grades.gradeID;
        `
        queryParams = [userID, assignmentID, classID];
    }

    // Check if the grade exists
    return new Promise((resolve, reject) => {
        connection.query(query, queryParams, (error, results, fields) => {
            if (error) {
                reject(`An error occurred while getting the grade. ${error}`);
                return;
            }

            // Grade does not exist
            if (results.length === 0) {
                // Insert the grade into the database
                let query, queryParams;
                if (classID == null) {
                    query = `
                    INSERT INTO Grades (grade, weightm userID) VALUES (?, ?, ?);
                    INSERT INTO GradesLinkToAssignments (gradeID, assignmentID) VALUES (LAST_INSERT_ID(), ?);
                    `;
                    querryParams = [grade, weight, userID, assignmentID];

                } else {
                    query = `
                    INSERT INTO Grades (grade, userID) VALUES (?, ?);
                    INSERT INTO GradesLinkToAssignments (gradeID, assignmentID) VALUES (LAST_INSERT_ID(), ?);
                    INSERT INTO GradesLinkToClasses (gradeID, classID) VALUES (LAST_INSERT_ID(), ?);
                    `;
                    querryParams = [grade, userID, assignmentID, classID];
                }
                connection.query(query, queryParams, (error, results, fields) => {
                    if (error) {
                        reject(`An error occurred while adding the grade. ${error}`);
                        return;
                    }

                    resolve(true);
                });

            // Grade does exist
            } else {
                // Check if an update is needed
                if (
                    results[0].grade != grade ||
                    results[0].weight != weight
                ) {
                    let query = `
                    UPDATE Grades
                    SET
                        Grades.grade = ?,
                        Grades.weight = ?
                    WHERE
                        Grades.gradeID = ?;

                    `;
                    let queryParams = [grade, weight, results[0].gradeID];
                    
                    // Update the grade
                    connection.query(query, queryParams, (error, results, fields) => {
                        if (error) {
                            reject(`An error occurred while updating the grade. ${error}`);
                            return;
                        }
                        resolve(true);
                    });
                } else {
                    resolve(true);
                }
            }
        });
    });
}


// -----------------
//   Get functions
// -----------------
function getGrade({ gradeID=null, assignmentID=null, classID=null, userID=null }) {
    // Check if the parameters are provided
    if (!helper.checkParams([gradeID, userID [assignmentID, courseID]], 1)) {
        return new Promise((resolve, reject) => {
            reject(`getGrade: No arguments provided. ${gradeID}, ${assignmentID}, ${userID}`);
        });
    }

    // Make the query
    let query, queryParams;
    // Looking for a grade by ID
    if (gradeID != null) {
        query = `SELECT grade, weight FROM Grades WHERE gradeID = ?;`;
        queryParams = [gradeID];
    
    // Looking for a grade by assignment
    } else if (assignmentID != null) {
        query = `
        SELECT
            Grades.grade,
            Grades.weight
        FROM Grades
        LEFT JOIN GradesLinkToAssignments ON Grades.gradeID = GradesLinkToAssignments.gradeID
        LEFT JOIN Users ON Grades.userID = Users.userID
        WHERE
            Grades.UserID = ? AND
            GradesLinkToAssignments.assignmentID = ?
        GROUP BY Grades.gradeID;
        `;
        queryParams = [userID, assignmentID];

    // Looking for a grade linked to a class
    } else if (classID != null) {
        query = `
        SELECT
            Grades.grade,
            Grades.weight
        FROM Grades
        LEFT JOIN GradesLinkToAssignments ON Grades.gradeID = GradesLinkToAssignments.gradeID
        LEFT JOIN GradesAssignmentsLinkToClasses ON GradesAssignmentsLinkToClasses.assignmentID = GradesLinkToAssignments.assignmentID
        LEFT JOIN Users ON Grades.userID = Users.userID
        WHERE
            Grades.UserID = ? AND
            GradesAssignmentsLinkToClasses.classID = ?
        GROUP BY Grades.gradeID;
        `;
        queryParams = [userID, classID];
    }

    // Check if the grade exists
    return new Promise((resolve, reject) => {
        connection.query(query, queryParams, (error, results, fields) => {
            if (error) {
                reject(`An error occurred while getting the grade. ${error}`);
                return;
            }

            resolve(results);
        });
    });
}

function getUser({ 
    userID=null, 
    username=null, 
    password=null, 
    email=null, 
    d2lEmail=null, 
    d2lPassword=null, 
    apiKey=null 
    }) {
    // Create a promise for the return
    return new Promise((resolve, reject) => {
        // Make sure at least one argument is provided
        if (!helper.checkParams([userID, username, password, email, [d2lEmail, d2lPassword], apiKey])) {
            reject(`getUser: No arguments provided ${userID}, ${username}, ${password}, ${email}, ${d2lEmail}, ${d2lPassword}, ${apiKey}`);
        }

        // Create the query
        let [ query, queryParams ] = helper.makeQuery(
            `SELECT * FROM Users WHERE `,
            [userID, username, password, email, d2lEmail, d2lPassword, apiKey],
            [ "userID", "username", "password", "email", "d2lEmail", "d2lPassword", "APIKey"],
            " AND "
        );

        if (query == null) {
            reject(`getUser: Querry failed: ${queryParams}`);
        }

        // Execute the query
        connection.query(query, queryParams, (error, results, fields) => {
            if (error) {
                reject(`An error occurred while getting the user. ${error}`);
                return;
            }
            resolve(results);
        });
    });
}

async function getUserToClassLink({userID=null, classID=null, linkID=null}) {
    return new Promise((resolve, reject) => {
        // Check if at least one parameter is provided
        if (!helper.checkParams([userID, classID, linkID])) {
            reject(`getUserToClassLink: No arguments provided ${userID}, ${classID}, ${linkID}`);
        }

        // Setup the query
        let [query, queryParams] = helper.makeQuery(
            "SELECT * FROM UsersToClasses WHERE ",
            [userID, classID, linkID],
            ["userID", "classID", "linkID"]
        )

        // Execute the query
        connection.query(query, queryParams, (error, results, fields) => {
            if (error) {
                console.error(`An error occurred while getting the user classes. ${error}`);
                return false;
            }
            resolve(results);
        });
    });
}

async function getClassAssignments(classID) {
    return new Promise((resolve, reject) => {
        // Create the query
        const query = `SELECT * FROM Assignments WHERE classID = ?`;

        // Execute the query
        connection.query(query, [classID], (error, results, fields) => {
            if (error) {
                console.error(`An error occurred while getting the user assignments. ${error}`);
                reject(`An error occurred while getting the user assignments. ${error}`);
            }
            resolve(results);
        });
    });
}

function getClass({classID=null, courseCode=null, link=null, name=null}) {
    // Execute the query
    return new Promise((resolve, reject) => {
        // Check if the parameters are provided
        if (!helper.checkParams([classID, courseCode, link, name])) {
            resolve(`getClass: No arguments provided. ${classID}, ${courseCode}, ${link}, ${name}`);
        }

        // Create the query
        let [query, queryParams] = helper.makeQuery(
            `SELECT * FROM Classes WHERE `,
            [classID, courseCode, link, name],
            ["classID", "courseCode", "link", "name"],
            " AND "
        );

        // Execute the querry
        connection.query(query, queryParams, (error, results, fields) => {
            if (error) {
                reject(`An error occurred while getting the class. ${error}\n${error.stack}`);
            }
            resolve(results);
        });
    });
}

function getAssignment({ 
    assignmentID=null, 
    classID=null, 
    link=null, 
    submissionURL=null, 
    name=null, 
    dueDate=null, 
    instructions=null, 
    grade=null 
    }) {
    // Execute the query
    return new Promise((resolve, reject) => {
        // Check that there are parameters that exsit
        if (!helper.checkParams([assignmentID, classID, link, submissionURL, [name, dueDate], instructions, grade])) {
            reject(`getAssignment: No arguments provided. ${assignmentID}, ${classID}, ${link}, ${submissionURL}, ${name}, ${dueDate}, ${instructions}, ${grade}`);
        }

        // Create the query
        let [query, queryParams] = helper.makeQuery(
            `SELECT * FROM Assignments WHERE `,
            [
                assignmentID, 
                classID, 
                link, 
                submissionURL, 
                name, 
                dueDate, 
                instructions, 
                grade
            ],
            [
                "assignmentID", 
                "classID", 
                "link", 
                "submissionURL", 
                "name", 
                "dueDate", 
                "instructions", 
                "grade"
            ],
            " AND "
        );

        // Execute the query
        connection.query(query, queryParams,(error, results, fields) => {
            if (error) {
                reject(`${error} query: ${query} params: ${queryParams}`);
                return;
            }
            resolve(results);
        });
    });
}

function getSubmissions({assignmentID=null}) {
    return new Promise((resolve, reject) => {
        // Check if the parameters are provided
        if (!helper.checkParams([assignmentID])) {
            reject(`getSubmissions: No arguments provided. ${assignmentID}`);
        }

        // Create the query
        let [query, queryParams] = helper.makeQuery(
            `SELECT * FROM Submissions WHERE `,
            [assignmentID],
            ["assignmentID"],
            " AND "
        );

        // Execute the query
        connection.query(query, queryParams, (error, results, fields) => {
            if (error) {
                reject(`An error occurred while getting the submissions. ${error}`);
                return;
            }
            resolve(results);
        });
    });

}

function getAttachments({submissionID=null, assignmentID=null, attachmentID=null}) {
    return new Promise((resolve, reject) => {
        // Check if the parameters are provided
        if (!helper.checkParams([submissionID, assignmentID, attachmentID])) {
            reject(`getAttachments: No arguments provided. ${submissionID}, ${assignmentID}, ${attachmentID}`);
        }

        let query, queryParams;
        if (submissionID != null) {
            // Create the query
            query = `SELECT attachmentID FROM AttachmentLinkToSubmission WHERE submissionID = ?;`;
            queryParams = [submissionID];
            
        } else if (assignmentID != null) {
            // Create the query
            query = `SELECT attachmentID FROM AttachmentLinkToAssignment WHERE assignmentID = ?;`;
            queryParams = [assignmentID];

        } else if (attachmentID != null) {
            // Create the query
            query = `SELECT * FROM Attachments WHERE attachmentID = ?;`;
            queryParams = [attachmentID];

        } else {
            reject("getAttachments: No submission or attachment ID provided");
        }

        // Execute the query
        connection.query(query, queryParams, (error, results, fields) => {
            if (error) {
                reject(`An error occurred while getting the attachments. ${error}`);
                return;
            }
            resolve(results);
        });
    });
}

function getAllCourseData(userID) {
    return new Promise(async (resolve, reject) => {
        // Get the classes
        let courseIDs = await getUserToClassLink({userID: userID});
        if (courseIDs == null) {
            reject("getAllCourseData: No course IDs found");
        }

        // Get the classes
        let classes = [];
        for (let i=0; i<courseIDs.length; i++) {
            let classID = courseIDs[i].classID;
            let course = await getClass({classID: classID});
            if (course == null) {
                continue;
            }

            // Get the assignments
            let assignments = await getClassAssignments(classID);
            if (assignments == null) {
                continue;
            }

            for (let j=0; j<assignments.length; j++) {
                // Get the grade
                let grade = await getGrade(
                    {
                        assignmentID: assignments[j].assignmentID, 
                        userID: userID
                    }
                );
                
                assignments[j].grade = grade;

                // Get the submissions
                let submissions = await getSubmissions(
                    {
                        assignmentID: assignments[j].assignmentID
                    }
                );
                for (let k=0; k<submissions.length; k++) {
                    // Get the attachments
                    let attachments = await getAttachments(
                        {
                            submissionID: submissions[k].submissionID
                        }
                    );
                    submissions[k].attachments = attachments;
                }
                assignments[j].submissions = submissions;

                // Get the attachments
                let attachments = await getAttachments(
                    {
                        assignmentID: assignments[j].assignmentID
                    }
                );
                assignments[j].attachments = attachments;
            }
            course[0].assignments = assignments;
            classes.push(course[0]);
        }
        resolve(classes);
    });
}

function getAllDataFast(userID) {
    return new Promise((resolve, reject) => {
        // Make sure we have the required parameters
        if (!helper.checkParams([userID])) {
            reject("getAllDataFast: No arguments provided");
        }
        
        // Make the query
        let query = `SELECT 
    Classes.name AS className,
    Classes.courseCode,
    Classes.link AS classLink,
    Classes.termShort,
    Classes.closed,
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'name', Assignments.name,
            'link', Assignments.link,
            'dueDate', Assignments.dueDate,
            'instructions', Assignments.instructions,
            'attachments', AssignmentAttachments.attachmentsJSON,
            'submissions', AssignmentSubmissions.submissionsJSON,
            'feedback', AssignmentsFeedback.feedbackJSON,
            'grade', Grades.grade,
            'submissionURL', Assignments.submissionURL
        )
    ) AS assignments
FROM Classes
JOIN Assignments ON Classes.classID = Assignments.classID
LEFT JOIN Grades ON Assignments.assignmentID = Grades.assignmentID
LEFT JOIN (
    SELECT 
        Assignments.assignmentID,
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'link', Attachments.link,
                'size', Attachments.size,
                'name', Attachments.name
            )
        ) AS attachmentsJSON
    FROM Attachments
    JOIN AttachmentLinkToAssignment ON Attachments.attachmentID = AttachmentLinkToAssignment.attachmentID
    JOIN Assignments ON AttachmentLinkToAssignment.assignmentID = Assignments.assignmentID
    GROUP BY Assignments.assignmentID
) AS AssignmentAttachments ON Assignments.assignmentID = AssignmentAttachments.assignmentID
LEFT JOIN (
    SELECT 
        Submissions.assignmentID,
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'submissionID', Submissions.submissionID,
                'comment', Submissions.comment, 
                'date', Submissions.date,
                'attachments', SubmissionAttachments.attachmentsJSON
            )
        ) AS submissionsJSON
    FROM Submissions
    LEFT JOIN (
        SELECT 
            AttachmentLinkToSubmission.submissionID,
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'link', Attachments.link,
                    'size', Attachments.size,
                    'name', Attachments.name
                )
            ) AS attachmentsJSON
        FROM Attachments
        JOIN AttachmentLinkToSubmission ON Attachments.attachmentID = AttachmentLinkToSubmission.attachmentID
        GROUP BY AttachmentLinkToSubmission.submissionID
    ) AS SubmissionAttachments ON Submissions.submissionID = SubmissionAttachments.submissionID
    GROUP BY Submissions.assignmentID
) AS AssignmentSubmissions ON Assignments.assignmentID = AssignmentSubmissions.assignmentID
LEFT JOIN (
    SELECT 
        Assignments.assignmentID,
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'html', Feedback.html,
                'date', Feedback.date
            )
        ) AS feedbackJSON
    FROM Feedback
    JOIN Submissions ON Feedback.submissionID = Submissions.submissionID
    JOIN Assignments ON Submissions.assignmentID = Assignments.assignmentID
    GROUP BY Assignments.assignmentID
) AS AssignmentsFeedback ON AssignmentsFeedback.assignmentID = Assignments.assignmentID
INNER JOIN UsersToClasses ON Classes.classID = UsersToClasses.classID
INNER JOIN Users ON UsersToClasses.userID = Users.userID
WHERE Users.userID = ?
GROUP BY Classes.classID;`;

        // Execute the query
        connection.query(query, [userID], (error, results, fields) => {
            if (error) {
                reject(`An error occurred while getting the data. ${error}`);
                return;
            }
            resolve(results);
        });
    });
}

module.exports = {
    connect,
    isConnected,
    updateCourse,
    updateAssignment,
    updateAttachment,
    updateSubmission,
    getUser,
    getClass,
    getAssignment,
    getUserToClassLink,
    getClassAssignments,
    getGrade,
    getSubmissions,
    getAttachments,
    getAllCourseData,
    getAllDataFast
};