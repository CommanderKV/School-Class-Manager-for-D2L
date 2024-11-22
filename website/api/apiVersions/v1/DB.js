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

// Add a keep alive to the connection
setInterval(() => {
    connection.query("SELECT 1 + 1 AS solution", (error, results, fields) => {
        if (error) {
            console.log("An error occurred while keeping the connection alive: " + error);
            if ("closed state" in error) {
                connection.end();
                connection.connect();
            }
        }
    });
}, 900000);

connection.addListener("error", (error) => {
    console.log("An error occurred with the database Link: " + error + " Code: " + error.code);
    if (error.code === "PROTOCOL_CONNECTION_LOST") {
        console.error("Database connection was closed. Attempting reconnect.");
        connection.end();
        connection.connect();
    
    // If we timed or cant connect out attempt reconnect up to 5 times then error and exit
    } else if (error.code == "ETIMEDOUT" || error.code == "ENOTFOUND" || error.code == "ECONNRESET") {
        // Set interval for 5 seconds
        let counter = 1;
        setInterval(async () => {
            // Check if we have tried for 5 times
            if (counter == 5) {
                clearInterval();
                return;
            
            // If we haven't exceeded our 5 attempts try again
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
    connection.connect((error) => {
        if (error) {
            if (error.code === "PROTOCOL_CONNECTION_LOST") {
                console.error("Database connection was closed. Attempting reconnect.");
                connection.end();
                connection.connect();
                if (!isConnected()) {
                    console.error("Failed to connect to the database");
                    return;
                }
            } else {
                console.error(`An error occurred while connecting to the database. ${error}`);
                return;
            }
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
        if (!helper.checkParams([[course, userID]])) {
            console.log(`updateCourse: No arguments provided. ${course != null ? course.name : null}, ${userID}`);
            reject(`updateCourse: No arguments provided. ${course != null ? course.name : null}, ${userID}`);
            return;
        }

        // Course does not exist
        getClass({userID: userID, courseCode: course.code, link: course.link, name: course.name})
        .then((data) => {
            if (data.length === 0) {
                // Check for terms
                if (course.terms == null) {
                    shortTerm = null;
                    longTerm = null;
                } else {
                    shortTerm = course.terms.short;
                    longTerm = course.terms.long;
                }

                // Make the query
                let [query, queryParams] = helper.makeQuery(
                    `INSERT INTO Classes `,
                    [
                        userID,
                        course.closed, 
                        course.link, 
                        course.name, 
                        course.code, 
                        shortTerm, 
                        longTerm,
                        course.syllabusURL,
                        course.assignmentsURL
                    ],
                    [
                        "userID",
                        "closed",
                        "link",
                        "name",
                        "courseCode",
                        "termShort",
                        "termLong",
                        "syllabusURL",
                        "assignmentsURL"
                    ],
                    ", ",
                    `);`,
                    true
                );

                connection.query(query, queryParams, (error, resultsCourse, fields) => {
                    // If there is an error display it
                    if (error) {
                        reject(`An error occurred while adding the course: ${error} Query: ${query} Params: ${queryParams}`);
                        return;
                    }

                    // Return the course ID
                    resolve(resultsCourse.insertId);
                });

            // Course does exist
            } else {
                // Get the first class that was returned (Should not be more than one class returned)
                data = data[0];

                // Check if an update is needed
                if (
                    data.closed != course.closed || 
                    data.link != course.link || 
                    data.name != course.name || 
                    data.termShort != course.terms.short || 
                    data.termLong != course.terms.long
                ) {
                    // Update the course
                    let [query, queryParams] = helper.makeQuery(
                        `UPDATE Courses SET `,
                        [
                            course.closed,
                            course.link,
                            course.name,
                            course.terms.short,
                            course.terms.long
                        ],
                        [
                            "closed",
                            "link",
                            "\`name\`",
                            "termShort",
                            "termLong"
                        ],
                        ", ",
                        ` WHERE courseID = ? AND userID = ?;`,
                        false
                    );
                    queryParams.push(data.courseID);
                    queryParams.push(userID);

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
    uid=null,
    name=null,
    due=null,
    instructions=null,
    gradeUID=null,
    courseID=null,
    submissionURL=null
    }) {
    return new Promise((resolve, reject) => {
        // Check that the parameters are given
        if (!helper.checkParams([
            link, 
            uid,
            name, 
            due, 
            instructions, 
            gradeUID,
            courseID, 
            submissionURL,
        ])) {
            reject(`updateAssignment: No arguments provided. ${link}, ${name}, ${due}, ${instructions}, ${grade}, ${weight} ${courseID}, ${submissionURL}`);
        }

        if (courseID == null) {
            reject("updateAssignment: No course ID provided");
        }


        // Check if assignment exists already
        getAssignment({
            link: link, 
            uid: uid,
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
                        uid,
                        submissionURL,
                        name,
                        due,
                        instructions,
                        courseID,
                        gradeUID
                    ],
                    [
                        "link",
                        "uid",
                        "submissionURL",
                        "name",
                        "dueDate",
                        "instructions",
                        "classID",
                        "gradeUID"
                    ],
                    ", ",
                    ");",
                    true
                );

                // Insert the assignment into the database
                connection.query(query, queryParams, (error, results, fields) => {
                    // Something went wrong while adding the assignment
                    if (error) {
                        reject(`An error occurred while adding the assignment.\n\t[QUERY] "${query}" ${error} ${queryParams}`);
                    }

                    // Return the assignment ID
                    resolve(results.insertId);
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
                }

                // Return the assignment ID
                resolve(data.assignmentID);
            }
        })
        .catch((error) => {
            reject(`An error occurred while getting the assignment. ${error} ${error.stack}`);
        });
    });
}

function updateAttachment({
    attachmentID=null, 
    assignmentID=null, 
    submissionID=null, 
    link=null, 
    size=null, 
    name=null
}) {
    // Both IDS cannot be null
    if (!helper.checkParams([attachmentID, assignmentID, submissionID], 1)) {
        return new Promise((resolve, reject) => {
            reject(`updateAttachment: No assignment or submission ID provided`);
        });
    } else if (link == null && size == null && name == null) {
        return new Promise((resolve, reject) => {
            reject(`updateAttachment: No arguments provided. ${link}, ${size}, ${name}`);
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
                if (assignmentID != null) {
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

                } else if (submissionID != null) {
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
                    return false;
                }
                if (query == null || queryParams == null) {
                    reject("updateAttachment: Query failed");
                    return false;
                }

                //console.log(query, queryParams, results.attachmentID, assignmentID, submissionID, link, size, name);
                connection.query(query, queryParams, (error, results, fields) => {
                    if (error) {
                        reject(`An error occurred while adding or linking the attachment. ${error} Query: ${query} Params: ${queryParams}`);
                        return;
                    }

                    resolve(true);
                })

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

function updateSubmission({
    submissionID=null, 
    assignmentID=null, 
    comment=null, 
    d2lSubmissionID=null, 
    date=null
}) {
    return new Promise((resolve, reject) => {
        // Check for parameters
        if (!helper.checkParams([submissionID, assignmentID, comment, d2lSubmissionID, date])) {
            console.log(`updateSubmission: No arguments provided ${submissionID}, ${assignmentID}, ${comment}, ${d2lSubmissionID}, ${date}`);
            reject(`updateSubmission: No arguments provided ${submissionID}, ${assignmentID}, ${comment}, ${d2lSubmissionID}, ${date}`);
        }

        if (submissionID == null && assignmentID == null) {
            console.log(`updateSubmission: No submission or assignment ID provided`);
            reject("updateSubmission: No submission ID or assignment ID provided");

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
                reject(`An error occurred while getting the submission. ${error} ${query} ${queryParams}`);
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
                    ");",
                    true
                );

                connection.query(query, queryParams, (error, results, fields) => {
                    if (error) {
                        console.log(`Submission failed to add to DB ${error}`);
                        reject(`An error occurred while adding the submission. ${error}`);
                        return;
                    }

                    // Return the submission ID
                    resolve(results.insertId);
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
                            d2lSubmissionID != results[0].d2lSubmissionID ? d2lSubmissionID : null
                        ],
                        ["assignmentID", "comment", "date", "d2lSubmissionID"],
                        ", ",
                        " WHERE submissionID = ?;",
                    );
                    queryParams.push(results[0].submissionID);

                    connection.query(query, queryParams, (error, results2, fields) => {
                        if (error) {
                            console.log(`An error occurred while updating the submission. ${error}`);
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

function updateGrade({ 
    grade=null, 
    achieved=null, 
    max=null, 
    weight=null, 
    assignmentID=null, 
    classID=null,
    uid=null
}) {    
    // Check if the parameters are provided
    if (!helper.checkParams([assignmentID, classID, uid], 2)) {
        return new Promise((resolve, reject) => {
            reject(`updateGrade: Invalid arguments provided: ${assignmentID}, ${classID}, ${uid}`);
        });
    }

    // Make the query
    let query = `SELECT * FROM Grades WHERE Grades.uId = ?;`
    let queryParams = [uid];

    // Check if the grade exists
    return new Promise((resolve, reject) => {
        connection.query(query, queryParams, (error, results, fields) => {
            if (error) {
                console.log(`An error occurred while getting the grade: ${error}, ${error.stack}, Query: ${query}, Params: ${queryParams}`);
                reject(`An error occurred while getting the grade. ${error}`);
            }

            // Grade does not exist
            if (results.length == 0) {
                // Insert the grade into the database
                if (assignmentID != null) {
                    query = `
                    INSERT INTO Grades (grade, achieved, max, weight, uId) VALUES (?, ?, ?, ?, ?);
                    INSERT INTO GradesLinkToAssignments (gradeID, assignmentID) VALUES (LAST_INSERT_ID(), ?);
                    `;
                    queryParams = [grade, achieved, max, weight, uid, assignmentID];
                } else if (classID != null) {
                    query = `
                    INSERT INTO Grades (grade, achieved, max, weight, uId) VALUES (?, ?, ?, ?, ?);
                    INSERT INTO GradesLinkToClasses (classID, gradeID) VALUES (? , LAST_INSERT_ID());
                    `;
                    queryParams = [grade, achieved, max, weight, uid, classID];
                } else {
                    reject("updateGrade: No assignment or class ID provided");
                }

                connection.query(query, queryParams, (error, results, fields) => {
                    if (error) {
                        console.log(`An error occurred while adding the grade. ${error}, Query: ${query}, Params: ${queryParams} Values: ${grade}, ${achieved}, ${max}, ${weight}, ${uid}, ${assignmentID}`);
                        reject(`An error occurred while adding the grade. ${error}`);
                    }
                    resolve(true);
                });

            // Grade does exist
            } else {
                // Check if an update is needed
                if (
                    results[0].grade != grade ||
                    results[0].weight != weight ||
                    results[0].achieved != achieved ||
                    results[0].max != max
                ) {
                    let query = `
                    UPDATE Grades
                    SET
                        Grades.grade = ?,
                        Grades.achieved = ?,
                        Grades.max = ?,
                        Grades.weight = ?
                    WHERE
                        Grades.gradeID = ?;
                    `;
                    let queryParams = [grade, achieved, max, weight, results[0].gradeID];
                    
                    // Update the grade
                    connection.query(query, queryParams, (error, results, fields) => {
                        if (error) {
                            reject(`An error occurred while updating the grade. ${error}`);
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
                reject(`An error occurred while getting the grade. ${error}, ${error.stack}, Query: ${query}, Params: ${queryParams}`);
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
            reject(`getUser: Query failed: ${queryParams}`);
        }

        // Execute the query
        connection.query(query, queryParams, (error, results, fields) => {
            if (error) {
                reject(`An error occurred while getting the user. ${error}`);
                console.log(query, queryParams);
                return;
            }
            resolve(results);
        });
    });
}

function createUser({email=null, username=null, password=null}) {
    // Check if the parameters are provided
    if (!helper.checkParams([email, [username, password]])) {
        return new Promise((resolve, reject) => {
            reject(`createUser: No arguments provided. ${email}, ${username}, ${password}`);
        });
    }

    // Create the promise
    return new Promise((resolve, reject) => {
        // Create the query
        let query, queryParams;
        if (email == null) {
            query = `INSERT INTO Users (username, password) VALUES (?, ?);`;
            queryParams = [username, password];
        } else {
            query = `INSERT INTO Users (email, username, password) VALUES (?, ?, ?);`;
            queryParams = [email, username, password];
        }

        // Execute the query
        connection.query(query, queryParams, (error, results, fields) => {
            if (error) {
                reject(`An error occurred while creating the user. ${error}`);
                return;
            }

            // Get the user
            getUser({username: username, password: password}).then((data) => {
                resolve(data);
            }).catch((error) => {
                reject(error);
            });
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

function getClass({userID=null, classID=null, courseCode=null, link=null, name=null}) {
    // Execute the query
    return new Promise((resolve, reject) => {
        // Check if the parameters are provided
        if (!helper.checkParams([classID, courseCode, link, name, userID])) {
            resolve(`getClass: No arguments provided. ${classID}, ${courseCode}, ${link}, ${name}`);
        }

        // Create the query
        let [query, queryParams] = helper.makeQuery(
            `SELECT * FROM Classes WHERE `,
            [userID, classID, courseCode, link, name],
            ["userID", "classID", "courseCode", "link", "name"],
            " AND "
        );

        // Execute the query
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
    uid=null,
    submissionURL=null, 
    name=null, 
    dueDate=null, 
    instructions=null, 
    grade=null 
    }) {
    // Execute the query
    return new Promise((resolve, reject) => {
        // Check that there are parameters that exist
        if (!helper.checkParams([assignmentID, classID, link, submissionURL, [name, dueDate], instructions, grade])) {
            reject(`getAssignment: No arguments provided. ${assignmentID}, ${classID}, ${link}, ${submissionURL}, ${name}, ${dueDate}, ${instructions}, ${grade}`);
        }

        // Create the query
        let query, queryParams;
        if (uid != null) {
            query = "SELECT * FROM Assignments WHERE uid = ?;";
            queryParams = [uid];
        } else {
            [query, queryParams] = helper.makeQuery(
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
        }

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
        let query = `
SELECT
    Classes.name AS className,          -- Class name
    Classes.courseCode,                 -- Class courseCode
    Classes.link AS classLink,          -- Class link
    Classes.termShort,                  -- Class termShort
    Classes.closed,                     -- Class closed
    Classes.assignmentsURL,				-- Class assignment URL
    Classes.syllabusURL,				-- Class syllabus URL
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'name', Assignments.name,                               -- Assignment name
            'link', Assignments.link,                               -- Assignment link
            'dueDate', Assignments.dueDate,                         -- Assignment dueDate
            'instructions', Assignments.instructions,               -- Assignment instructions
            'attachments', AssignmentAttachments.attachmentsJSON,   -- Assignment attachments
            'submissions', AssignmentSubmissions.submissionsJSON,   -- Assignment submissions
            'feedback', AssignmentsFeedback.feedbackJSON,           -- Assignment feedback
            'submissionURL', Assignments.submissionURL,             -- Assignment submissionURL
            'gradeUID', Assignments.gradeUID			            -- Uid for the grade of assignment
        )
    ) AS assignments,
    classGrades.classGrades
FROM Classes                                                        -- Get the classes details
JOIN Assignments ON Classes.classID = Assignments.classID           -- Get the assignments details
LEFT JOIN GradesLinkToClasses ON GradesLinkToClasses.classID = Classes.classID
LEFT JOIN Grades ON Grades.gradeID = GradesLinkToClasses.gradeID
LEFT JOIN (                                                         -- Get the assignments attachments
    SELECT 
        Assignments.assignmentID,           -- Assignment ID
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'link', Attachments.link,   -- Attachment Link
                'size', Attachments.size,   -- Attachment size
                'name', Attachments.name    -- Attachment name
            )
        ) AS attachmentsJSON
    FROM Attachments                                                                                        -- Get the attachments details
    JOIN AttachmentLinkToAssignment ON Attachments.attachmentID = AttachmentLinkToAssignment.attachmentID   -- Get the attachment link to assignment
    JOIN Assignments ON AttachmentLinkToAssignment.assignmentID = Assignments.assignmentID                  -- Get the assignments details
    GROUP BY Assignments.assignmentID                                                                       -- Group by assignment ID 
) AS AssignmentAttachments ON Assignments.assignmentID = AssignmentAttachments.assignmentID                 -- Assign the attachments to AssignmentAttachments
LEFT JOIN (                                                                                                 -- Get the assignments submissions
    SELECT 
        Submissions.assignmentID,                                       -- Assignment ID
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'd2lSubmissionID', Submissions.d2lSubmissionID,         -- Submission ID
                'comment', Submissions.comment,                         -- Submission comment
                'date', Submissions.date,                               -- Submission date
                'attachments', SubmissionAttachments.attachmentsJSON    -- Submission attachments
            )
        ) AS submissionsJSON
    FROM Submissions                                                    -- Get the submissions details
    LEFT JOIN (
        SELECT 
            AttachmentLinkToSubmission.submissionID,    -- Submission ID
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'link', Attachments.link,           -- Attachment link
                    'size', Attachments.size,           -- Attachment size
                    'name', Attachments.name            -- Attachment name
                )
            ) AS attachmentsJSON
        FROM Attachments                                                                                        -- Get the attachments details
        JOIN AttachmentLinkToSubmission ON Attachments.attachmentID = AttachmentLinkToSubmission.attachmentID   -- Get the attachment link to submission
        GROUP BY AttachmentLinkToSubmission.submissionID                                                        -- Group by submission ID
    ) AS SubmissionAttachments ON Submissions.submissionID = SubmissionAttachments.submissionID                 -- Assign the attachments to SubmissionAttachments
    GROUP BY Submissions.assignmentID                                                                           -- Group by assignment ID     
) AS AssignmentSubmissions ON Assignments.assignmentID = AssignmentSubmissions.assignmentID                     -- Assign the submissions to AssignmentSubmissions
LEFT JOIN (                                                                                                     -- Get the assignments feedback
    SELECT 
        Assignments.assignmentID,       -- Assignment ID
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'html', Feedback.html,  -- Feedback html
                'date', Feedback.date   -- Feedback date
            )
        ) AS feedbackJSON
    FROM Feedback                                                                           -- Get the feedback details
    JOIN Submissions ON Feedback.submissionID = Submissions.submissionID                    -- Get the submissions details
    JOIN Assignments ON Submissions.assignmentID = Assignments.assignmentID                 -- Get the assignments details
    GROUP BY Assignments.assignmentID                                                       -- Group by assignment ID  
) AS AssignmentsFeedback ON AssignmentsFeedback.assignmentID = Assignments.assignmentID     -- Assign the feedback to AssignmentsFeedback
JOIN (
    SELECT
        Classes.classID,
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'uid', Grades.uId,				-- Grade uid
                'grade', Grades.grade,			-- Grade achieved (90%) etc
                'achieved', Grades.achieved,	-- Grade points achieved
                'max', Grades.max,				-- Grade points maximum
                'weight', Grades.weight			-- Grade weight maximum
            )
        ) AS classGrades
    FROM Grades
    LEFT JOIN GradesLinkToClasses ON GradesLinkToClasses.gradeID = Grades.gradeID
    LEFT JOIN Classes ON GradesLinkToClasses.classID = Classes.classID
    GROUP BY Classes.classID
) AS classGrades ON Classes.classID = classGrades.classID
WHERE Classes.userID = ?
GROUP BY 
    Classes.classID,
    Classes.name,
    Classes.courseCode,
    Classes.link,
    Classes.termShort,
    Classes.closed,
    Classes.assignmentsURL,
    Classes.syllabusURL;
`;

        // Execute the query
        connection.query(query, [userID], (error, results, fields) => {
            if (error) {
                reject(`An error occurred while getting the data. ${error}`);
                return;
            }
            resolve(results[0]);
        });
    });
}

function getUserSettings(userID) {
    return new Promise((resolve, reject) => {
        // Create the query
        let query = `SELECT username, d2lEmail, d2lLink FROM Users WHERE userID = ?;`;

        // Execute the query
        connection.query(query, [userID], (error, results, fields) => {
            if (error) {
                reject(`An error occurred while getting the user settings. ${error}`);
                return;
            }
            resolve(results);
        });
    });
}

function saveUserSettings(userID, data) {
    return new Promise((resolve, reject) => {
        // Check if the parameters are provided
        if (!helper.checkParams([userID, data])) {
            console.log(`saveUserSettings: No arguments provided. ${userID}, ${data}`);
            reject(`saveUserSettings: No arguments provided. ${userID}, ${data}`);
        }

        // Create the query
        var query, queryParams;
        if (data.username == null || data.password == null) {
            // D2L settings
            if (data.d2lPassword != null) {
                query = `UPDATE Users SET d2lEmail = ?, d2lLink = ?, d2lPassword = ? WHERE userID = ?;`;
                queryParams = [data.d2lEmail, data.d2lLink, data.d2lPassword, userID];
            } else {
                query = `UPDATE Users SET d2lEmail = ?, d2lLink = ? WHERE userID = ?;`;
                queryParams = [data.d2lEmail, data.d2lLink, userID];
            }

        } else {
            // User settings
            if (data.password != null) {
                query = `UPDATE Users SET username = ?, password = ? WHERE userID = ?;`;
                queryParams = [data.username, data.password, userID];
            } else {
                query = `UPDATE Users SET username = ? WHERE userID = ?;`;
                queryParams = [data.username, userID];
            }
        }

        // Execute the query
        connection.query(query, queryParams, (error, results, fields) => {
            if (error) {
                console.log(`An error occurred while saving the user settings. ${error}`);
                reject(`An error occurred while saving the user settings. ${error}`);
                return;
            }
            resolve(results);
        });
    });
}

module.exports = {
    connect,
    isConnected,
    updateGrade,
    updateCourse,
    updateAssignment,
    updateAttachment,
    updateSubmission,
    getUser,
    getClass,
    getAssignment,
    getClassAssignments,
    getGrade,
    getSubmissions,
    getAttachments,
    getAllCourseData,
    getAllDataFast,
    getUserSettings,
    saveUserSettings,
    createUser
};