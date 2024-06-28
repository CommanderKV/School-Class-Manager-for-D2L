// Get mysql module
const mysql = require("mysql2");

// Create a connection to the database
const connection = mysql.createConnection({ 
    host: process.env.DB_HOST,
    port: process.env.DB_PORT, 
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

// Connect to the database
connection.connect((error) => {
    if (error) {
        console.error(`An error occurred while connecting to the database. ${error}`);
        return;
    }
    console.log("Connected to the database");
});

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
        getClass({ courseCode: course.CODE })
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
                    ");",
                    true
                );

                connection.query(query, queryParams, (error, results, fields) => {
                    if (error) {
                        reject(`An error occurred while adding the course: ${error} Query: ${query} Params: ${queryParams}`);
                    }
                });

                // Get the course ID
                getClass({ 
                    link: course.LINK, 
                    name: course.NAME, 
                    courseCode: course.CODE, 
                }).then((data) => {
                    // Check if the course was found
                    if (data != null){
                        if (data.length == 1) {
                            // Get the course ID
                            let courseID = data[0].classID;

                            // Make the query
                            let [query, queryParams] = helper.makeQuery(
                                `INSERT INTO UsersToClasses `,
                                [userID, courseID],
                                ["userID", "classID"],
                                ", ",
                                ");",
                                true
                            );

                            // Link the course to the user
                            connection.query(query, queryParams, (error, results, fields) => {
                                if (error) {
                                    reject(`An error occurred while linking the course and user. ${error}`);
                                    return;
                                }
                                resolve(courseID);
                            });
                        } else if (data.length == 0) {
                            console.log(`Failed to get course ID no courses found: ${data}`)

                        } else {
                            console.log(`Failed to get course ID too many courses found. ${data}`)
                        }
                    
                    // Course was not found
                    } else {
                        reject("Failed to get course ID");
                    }
                })
                .catch((error) => {
                    reject(`An error occurred while getting the course ID. ${error}`);
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
            courseID, 
            submissionURL,
            userID
        ])) {
            reject(`updateAssignment: No arguments provided. ${link}, ${name}, ${due}, ${instructions}, ${grade}, ${courseID}, ${submissionURL}`);
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
                    ");",
                    true,
                );

                // Insert the assignment into the database
                connection.query(query, queryParams, (error, results, fields) => {
                    // Something went wrong while adding the assignment
                    if (error) {
                        reject(`An error occurred while adding the assignment.\n\t[QUERY] "${query}" ${error} CourseID: ${courseID}`);
                    
                    // Assignment was added successfully
                    } else {
                        // Get the assignment ID
                        let [query, queryParams] = helper.makeQuery(
                            `SELECT assignmentID FROM Assignments WHERE `,
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
                            " AND "
                        );

                        // Get the assignment ID
                        connection.query(query, queryParams, (error, results, fields) => {
                            if (error) {
                                reject(`An error occurred while getting the assignment ID. ${error}`);
                                return;
                            }

                            if (results.length === 0) {
                                reject(`Failed to get assignment ID. ${results}`);
                            } else if (results.length > 1) {
                                reject(`Too many assignments found. ${results}`);
                            } else {
                                // Insert the grade
                                updateGrade({ grade: grade, assignmentID: results[0].assignmentID, userID: userID}).catch((error) => {
                                    reject(`An error occurred while adding the grade. ${error}`);
                                });
                                resolve(results[0].assignmentID);
                            }
                        });
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
                let [query, queryParams] = helper.makeQuery(
                    `INSERT INTO Attachments `,
                    [link, size, name],
                    ["link", "size", "name"],
                    ", ",
                    ");",
                    true
                );
                connection.query(query, queryParams, (error, results, fields) => {
                    if (error) {
                        reject(`An error occurred while adding the attachment. ${error} Querry: ${query} Params: ${queryParams}`);
                        return;
                    }

                    // Get the attachment ID
                    let [query, queryParams] = helper.makeQuery(
                        `SELECT attachmentID FROM Attachments WHERE `,
                        [link, size, name],
                        ["link", "size", "name"],
                        " AND "
                    );
                    connection.query(query, queryParams, (error, results, fields) => {
                        if (error) {
                            reject(`An error occurred while getting the attachment ID. ${error}`);
                            return;
                        }
                        // Save attachment ID
                        let attachmentID = results[0].attachmentID;

                        var query, queryParams;
                        if (attachmentID != null && assignmentID != null) {
                            [query, queryParams] = helper.makeQuery(
                                `INSERT INTO AttachmentLinkToAssignment `
                                [attachmentID, assignmentID],
                                ["attachmentID", "assignmentID"],
                                ", ",
                                ");",
                                true
                            )
                        } else if (attachmentID != null && assignmentID != null) {
                            [query, queryParams] = helper.makeQuery(
                                `INSERT INTO AttachmentLinkToSubmission `
                                [attachmentID, submissionID],
                                ["attachmentID", "submissionID"],
                                ", ",
                                ");",
                                true
                            )
                        } else {
                            reject("updateAttachment: No assignment or submission ID provided");
                        }

                        // Link the attachment to the assignment
                        connection.query(query, queryParams, (error, results, fields) => {
                            if (error) {
                                reject(`An error occurred while linking the attachment and assignment. ${query} ${queryParams} ${error} ${error.stack}`);
                                return;
                            }
                            resolve(true);
                        });
                    });
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
                        [link, size, name],
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
                    ");",
                    true
                );
                connection.query(query, queryParams, (error, results, fields) => {
                    if (error) {
                        reject(`An error occurred while adding the submission. ${error}`);
                        return;
                    }
                    
                    // Get the submission ID
                    let [query, queryParams] = helper.makeQuery(
                        `SELECT submissionID FROM Submissions WHERE `,
                        [assignmentID, submissionID],
                        ["assignmentID", "d2lSubmissionID"],
                        " AND "
                    );
                    connection.query(query, queryParams, (error, results, fields) => {
                        if (error) {
                            reject(`An error occurred while getting the submission ID. ${error}`);
                            return;
                        }
                        resolve(results[0].submissionID);
                    });
                });

            // Submission does exist
            } else {
                // Check if an update is needed
                if (
                    results[0].d2lSubmissionID != submissionID || 
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
                            submissionID != results[0].d2lSubmissionID ? submissionID : null
                        ],
                        ["assignmentID", "comment", "date", "d2lSubmissionID"],
                        ", ",
                        " WHERE submissionID = ?;",
                    );
                    queryParams.push(results[0].submissionID);

                    connection.query(query, queryParams, (error, results, fields) => {
                        if (error) {
                            reject(`An error occurred while updating the submission. ${error}`);
                            return;
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

function updateGrade({ grade=null, assignmentID=null, userID=null }) {
    // Check if the parameters are provided
    if (!helper.checkParams([grade, assignmentID, userID], 3)) {
        return new Promise((resolve, reject) => {
            reject(`updateGrade: No arguments provided. ${grade}, ${assignmentID}, ${userID}`);
        });
    }

    // Make the query
    let [query, queryParams] = helper.makeQuery(
        `SELECT * FROM Grades WHERE `,
        [grade, assignmentID, userID],
        ["grade", "assignmentID", "userID"],
        " AND "
    );

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
                let [query, queryParams] = helper.makeQuery(
                    `INSERT INTO Grades `,
                    [grade, assignmentID, userID],
                    ["grade", "assignmentID", "userID"],
                    ", ",
                    ");",
                    true
                );
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
                if (results[0].grade != grade) {
                    // Update the grade
                    let [query, queryParams] = helper.makeQuery(
                        `UPDATE Grades SET `,
                        [grade],
                        ["grade"],
                        ", ",
                        " WHERE assignmentID = ? AND userID = ?;",
                    );
                    queryParams.push(assignmentID);
                    queryParams.push(userID);

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
function getGrade({ gradeID=null, assignmentID=null, userID=null }) {
    // Check if the parameters are provided
    if (!helper.checkParams([gradeID, [assignmentID, userID]], 1)) {
        return new Promise((resolve, reject) => {
            reject(`getGrade: No arguments provided. ${gradeID}, ${assignmentID}, ${userID}`);
        });
    }

    // Make the query
    let [query, queryParams] = helper.makeQuery(
        `SELECT * FROM Grades WHERE `,
        [gradeID, assignmentID, userID],
        ["gradeID", "assignmentID", "userID"],
        " AND "
    );

    // Check if the grade exists
    return new Promise((resolve, reject) => {
        connection.query(query, queryParams, (error, results, fields) => {
            if (error) {
                reject(`An error occurred while getting the grade. ${error}`);
                return;
            }
            if (results.length > 1) {
                reject(`Too many grades found. ${results}`);
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

module.exports = {
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
    getSubmissions
};