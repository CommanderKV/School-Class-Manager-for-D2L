// Load dotenv to load environment variables
require("dotenv").config();

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
connection.connect((err) => {
    if (err) {
        console.error("An error occurred while connecting to the database", err);
        return;
    }
    console.log("Connected to the database");
});

// --------------------
//   Update functions
// --------------------
function updateCourse(course, userID) {
    return new Promise((resolve, reject) => {
        // Course does not exsit
        getClass(course.CODE).then((data) => {
            if (data.length === 0) {
                // Insert the course into the database
                var query = `INSERT INTO Courses (closed, link, name, courseCode, termShort, termLong) VALUES (${course.CLOSED}, "${course.LINK}", "${course.NAME}", "${course.CODE}", "${course.TERMS.SHORT}", "${course.TERMS.LONG}")`;
                connection.query(query, (error, results, fields) => {
                    if (error) {
                        reject("An error occurred while adding the course", error);
                        return;
                    }
                });
        
                // Get the course ID
                getClass(course.CODE).then((data) => {
                    if (data) {
                        console.log(data);
                        courseID = data[0].classID;

                        // Link the course to the user
                        var query = `INSERT INTO UsersToCourses (userID, classID) VALUES (${userID}, ${courseID})`;
                        connection.query(query, (error, results, fields) => {
                            if (error) {
                                reject("An error occurred while linking the course and user", error);
                                return;
                            }
                            resolve(courseID);
                        });
                    } else {
                        reject("Failed to get course ID");
                    }
                });

            // Course does exist
            } else {
                // Check if an update is needed
                if (
                    data.closed != course.CLOSED || 
                    data.link != course.LINK || 
                    data.name != course.NAME || 
                    data.termShort != course.TERMS.SHORT || 
                    data.termLong != course.TERMS.LONG
                ) {
                    // Update the course
                    const query = `UPDATE Courses SET closed = ${course.CLOSED}, link = "${course.LINK}", name = "${course.NAME}", termShort = "${course.TERMS.SHORT}", termLong = "${course.TERMS.LONG}" WHERE courseID = "${data.courseID}"`;
                    connection.query(query, (error, results, fields) => {
                        if (error) {
                            reject("An error occurred while updating the course", error);
                            return;
                        }
                        resolve(data.courseID);
                    });
                }
                resolve(data.courseID);
            }
        });
    });
}

function updateAssignment(assignment, submissionURL, classID) {
    return new Promise((resolve, reject) => {
        // Check if assignment exists already
        getAssignment(assignment.LINK).then((data) => {
            // Assignment does not exist
            if (data.length === 0) {
                // Insert the assignment into the database
                const query = `INSERT INTO Assignments (classID, link, submissionURL, name, dueDate, instructions) VALUES (${classID}, "${assignment.LINK}", "${submissionURL}""${assignment.NAME}", "${assignment.DUE}", "${assignment.INSTRUCTIONS}")`;
                connection.query(query, (error, results, fields) => {
                    if (error) {
                        reject("An error occurred while adding the assignment", error);
                    } else {
                        // Get the assignment ID
                        getAssignment(assignment.LINK).then((data) => {
                            if (data.length === 0) {
                                reject("Failed to get assignment ID");
                            }
                            resolve(data.assignmentID);
                        });
                    }
                });

            // Assignment does exist
            } else {
                // Check if an update is needed
                if (
                    data.link != assignment.LINK || 
                    data.submissionURL != submissionURL ||
                    data.name != assignment.NAME || 
                    data.dueDate != assignment.DUE ||
                    data.instructions != assignment.INSTRUCTIONS ||
                    data.grade != assignment.GRADE
                ) {
                    // Update the assignment
                    const query = `UPDATE Assignments SET link = "${assignment.LINK}", submissionURL = "${submissionURL}" name = "${assignment.NAME}", dueDate = "${assignment.DUE}", instructions = "${assignment.INSTRUCTIONS}", grade = "${assignment.GRADE}" WHERE assignmentID = "${data.assignmentID}"`;
                    connection.query(query, (error, results, fields) => {
                        if (error) {
                            reject("An error occurred while updating the assignment", error);
                        } else {
                            resolve(assignmentID);
                        }
                    });
                } else {
                    resolve(data.assignmentID);
                }
            }
        });
    });
}

function updateAttachment(attachment, assignmentID=null, submissionID=null) {
    // Both IDS cannot be null
    if (assignmentID == null && submissionID == null) {
        return new Promise((resolve, reject) => {
            reject("No assignment or submission ID provided");
        });
    }

    // Update the attachment
    return new Promise((resolve, reject) => {
        // Check if attachment exists already
        const query = `SELECT * FROM Attachments WHERE link = "${attachment.LINK}"`;
        connection.query(query, (error, results, fields) => {
            if (error) {
                reject("An error occurred while getting the attachment", error);
                return;
            }

            // Attachment does not exist
            if (results.length === 0) {
                // Insert the attachment into the database
                const query = `INSERT INTO Attachments (submissionID, assignmentID, link, size) VALUES (${submissionID}, ${assignmentID}, "${attachment.LINK}", "${attachment.NAME}", "${attachment.SIZE}")`;
                connection.query(query, (error, results, fields) => {
                    if (error) {
                        reject("An error occurred while adding the attachment", error);
                        return;
                    }
                    resolve(true);
                });

            // Attachment does exist
            } else {
                // Check if an update is needed
                if (
                    results[0].submissionID != submissionID ||
                    results[0].assignmentID != assignmentID ||
                    results[0].link != attachment.LINK || 
                    results[0].size != attachment.SIZE
                ) {
                    // Update the attachment
                    const query = `UPDATE Attachments SET submissionID = ${submissionID}, assignmentID = ${assignmentID} link = "${attachment.LINK}", size = "${attachment.SIZE}" WHERE attachmentID = "${results[0].attachmentID}"`;
                    connection.query(query, (error, results, fields) => {
                        if (error) {
                            reject("An error occurred while updating the attachment", error);
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

function updateSubmission(submission, assignmentID) {
    return new Promise((resolve, reject) => {
        // Check if submission exists already
        const query = `SELECT * FROM Submissions WHERE link = "${submissionURl}"`;
        connection.query(query, (error, results, fields) => {
            if (error) {
                reject("An error occurred while getting the submission", error);
                return;
            }

            // Submission does not exist
            if (results.length === 0) {
                // Insert the submission into the database
                const query = `INSERT INTO Submissions (assignmentID, comment, date, d2lSubmissionID) VALUES (${assignmentID}, "${submission.COMMENT}", "${submission.DATE}", ${submission.ID})`;
                connection.query(query, (error, results, fields) => {
                    if (error) {
                        reject("An error occurred while adding the submission", error);
                        return;
                    }
                    
                    // Get the submission ID
                    const query = `SELECT submissionID FROM Submissions WHERE assignmentID = ${assignmentID} AND d2lSubmissionID = ${submission.ID}`;
                    connection.query(query, (error, results, fields) => {
                        if (error) {
                            reject("An error occurred while getting the submission ID", error);
                            return;
                        }
                        resolve(results[0].submissionID);
                    });
                });

            // Submission does exist
            } else {
                // Check if an update is needed
                if (
                    results[0].d2lSubmissionID != submission.ID || 
                    results[0].comment != submission.COMMENT || 
                    results[0].date != submission.DATE
                ) {
                    // Update the submission
                    const query = `UPDATE Submissions SET d2lSubmissionID = "${submission.ID}", comment = "${submission.COMMENT}", date = "${submission.DATE}" WHERE submissionID = "${results[0].submissionID}"`;
                    connection.query(query, (error, results, fields) => {
                        if (error) {
                            reject("An error occurred while updating the submission", error);
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


// -----------------
//   Get functions
// -----------------
function getUser(userID) {
    // Create a promise for the return
    return new Promise((resolve, reject) => {
        // Create the query
        const query = `SELECT * FROM Users WHERE userID = ${userID}`;

        // Execute the query
        connection.query(query, (error, results, fields) => {
            if (error) {
                reject("An error occurred while getting the user" + error);
                return;
            }
            resolve(results[0]);
        });
    });
}

function getUserClasses(userID) {
    // Create the query
    const query = `SELECT classID FROM UsersToClasses WHERE userID = "${userID}"`;

    // Execute the query
    result = connection.query(query, (error, results, fields) => {
        if (error) {
            console.error("An error occurred while getting the user classes", error);
            return;
        }
        return results;
    });

    // Get all classes
    const classes = [];
    for (let i = 0; i < result.length; i++) {
        const query = `SELECT * FROM Classes WHERE classID = "${result[i].classID}"`;
        connection.query(query, (error, results, fields) => {
            if (error) {
                console.error("An error occurred while getting the user classes", error);
                return;
            }
            classes.push(results);
        });
    }

    // Return the result
    return result;
}

function getUserAssignments(classID) {
    // Create the query
    const query = `SELECT * FROM Assignments WHERE classID = "${classID}"`;

    // Execute the query
    result = connection.query(query, (error, results, fields) => {
        if (error) {
            console.error("An error occurred while getting the user assignments", error);
            return;
        }
        return results;
    });
    
    // Return the result
    return result;
}

function getUserData(userID) {
    // Get all classes the user is enrolled in
    const userClasses = getUserClasses(userID);

    // Get all assignments for the user
    for(let i=0; i<userClasses.length; i++) {
        userClasses["assignments"] = getUserAssignments(userClasses[i].classID);
    }
    
    // Return the user data
    return userClasses;
}

function getClass(courseCode) {
    // Create the query
    const query = `SELECT * FROM Classes WHERE courseCode = "${courseCode}"`;

    // Execute the query
    return new Promise((resolve, reject) => {
        connection.query(query, (error, results, fields) => {
            if (error) {
                reject("An error occurred while getting the class", error);
                return;
            }
            resolve(results);
        });
    })
}

function getAssignment(assignmentLink) {
    // Create the query
    const query = `SELECT * FROM Assignments WHERE link = "${assignmentLink}"`;

    // Execute the query
    return new Promise((resolve, reject) => {
        connection.query(query, (error, results, fields) => {
            if (error) {
                reject("An error occurred while getting the assignment", error);
                return;
            }
            resolve(results);
        });
    });
}

// Security functions
function checkUser(username, password) {
    // Create the query
    const query = `SELECT * FROM Users WHERE username = "${username}" AND password = "${password}"`;

    // Execute the query
    return new Promise((resolve, reject) => {
        connection.query(query, (error, results, fields) => {
            if (error) {
                console.error("An error occurred while checking the user" + error);
                reject(false);
                return;
            }
            resolve(results[0]);
        });
    });
}

function checkAPIKey(apiKey) {
    // Create the query
    const query = `SELECT * FROM Users WHERE APIKey = "${apiKey}"`;

    // Execute the query
    return new Promise((resolve, reject) => {
        connection.query(query, (error, results, fields) => {
            if (error) {
                console.error("An error occurred while checking the API key" + error);
                reject(false);
                return;
            }
            resolve(results[0]);
        });
    });
}

function checkIn(username, password) {
    return new Promise((masterResolve, masterReject) => {
        // Check if user is in the database
        checkUser(username, password).then((data) => {
            // User is not in the database
            if (data === false) {
                // Do not allow access
                masterReject(false);
            
            // User is in the database
            } else {
                // Allow access
                masterResolve(data);
            }
        });
    });
}

module.exports = {
    updateCourse,
    updateAssignment,
    updateAttachment,
    updateSubmission,
    getUser,
    getUserClasses,
    getUserAssignments,
    getUserData,
    getClass,
    getAssignment,
    checkIn,
    checkAPIKey
};