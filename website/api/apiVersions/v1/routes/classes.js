// Get express
const express = require("express");

// Get router
const router = express.Router();

// Get the DB module
const DB = require("../DB");

// Get the child_process module
const child_process = require("child_process");

// Get the fs module
const fs = require("fs");
const helper = require("../helper");

// Get the encryption module
const security = require("../security");
const { error } = require("console");


// Features to add:
// - Add a estimated time of completion 
//   based off of the average time 
//   it takes to load a course.
let progressTracker = {};
let timeToRemoveProgressTracker = 10 * 60 * 1000;

// ---------------------
//   Utility functions
// ---------------------
async function runScript(args, apiKey) {
    return new Promise((resolve, reject) => {
        // Define vars
        let buffer = "";
        let startTime = new Date();
        let endTime = new Date();
        let times = [];
        let coursePath = __dirname+`/${apiKey}.json`;
            
        // Run the script
        let pythonProcess = child_process.spawn("python3", args);

        // Allow the process to be ended
        progressTracker[apiKey].script = pythonProcess;

        // Update the progress tracker
        progressTracker[apiKey].status = "running";
        progressTracker[apiKey].progress += 1;
        progressTracker[apiKey].output.push("Script started");

        /////////////////////////////
        // Deal with script output //
        /////////////////////////////
        // Add a listener for script output
        var inError = false;
        pythonProcess.stdout.on("data", (data) => {
            // We don't want to log an error if the script is already in an error state
            if (inError) {return;}

            // We don't want to log if we've already failed
            if (progressTracker[apiKey].status == "Failed") {return;}

            // Add the data to the buffer
            buffer += data.toString();
            let lines = buffer.split("\n");
            buffer = lines.pop();

            // Go through each line
            lines.forEach((line) => {
                // Check to see if the Message has the number of courses found
                if (line.startsWith("[Notice] Found")) {
                    // Update progress tracker
                    progressTracker[apiKey].steps += parseInt(line.split(" ")[2]);
                
                // Check to see if a course is being loaded
                } else if(line.startsWith("[Success]") && line.includes(" loaded!")) {
                    // Update progress tracker
                    progressTracker[apiKey].progress += 1;
                    
                    // Update the times array
                    endTime = new Date();
                    times.push(endTime - startTime);
                    startTime = new Date();

                    // Update the estimated time of completion
                    let averageTime = 0;
                    times.forEach((time) => {
                        averageTime += time;
                    });
                    averageTime = averageTime / times.length;

                    // Update the progress tracker
                    progressTracker[apiKey].ETA = averageTime * (progressTracker[apiKey].steps - progressTracker[apiKey].progress);
                }

                // Check to see if the line is the start of an error
                if (line.startsWith("Traceback")) {
                    inError = true;
                    return;
                }

                // Add the line to the output
                progressTracker[apiKey].output.push(line);
            });
        });

        // Add a listener for script errors
        let errorData = "";
        pythonProcess.stderr.on("data", (data) => {
            // Don't need to stack errors on errors
            if (
                progressTracker[apiKey].status == "Failed" && 
                progressTracker[apiKey].error != "Invalid login credentials"
            ) {
                console.log(data.toString());
                return;
            }
            if (
                progressTracker[apiKey].status == "Failed" &&
                !errorText.includes("ValueError: Invalid login credentials!")
            ) {return;}

            // Set the status to failed
            progressTracker[apiKey].status = "Failed";

            // Get the error text
            var errorText = data.toString();

            // Check if the error is due to invalid login credentials
            if (errorText.includes("ValueError: Invalid login credentials!")) {
                // Update the progress tracker
                progressTracker[apiKey].error = "Invalid login credentials";

                // Reject the promise with the error
                reject("Invalid login credentials");

            // If any other error occurs
            } else {
                // Update the progress tracker
                progressTracker[apiKey].error = `Script sent: ${errorText}`;

                // Reject the promise with the error
                reject("Script failed with error: " + errorText);
            }

            if (progressTracker[apiKey].error != "Invalid login credentials") {
                // Log the error to the console
                errorData += data.toString() + "\n";
            }
        });

        // Add a listener for when the script is done
        pythonProcess.on("close", (code) => {
            if (code !== null) {
                if (code != 0 && progressTracker[apiKey].status != "Failed") {
                    // Update the progress tracker
                    progressTracker[apiKey].status = "Failed";
                    progressTracker[apiKey].output.push("Script failed");
                    progressTracker[apiKey].error = `Script failed with code: ${code}`;

                    // Remove progress tracker data after 5 minutes
                    setTimeout(() => {
                        // Remove the tracker
                        delete progressTracker[apiKey];

                        // Remove the file
                        if (fs.existsSync(coursePath)) {
                            fs.unlinkSync(coursePath);
                        }
                    }, timeToRemoveProgressTracker/2);

                    // Reject the promise with the reason for failure
                    // being that the script has failed
                    reject("Script exited with code: " + code);
                    return;
                } else if (code != 0) {
                    if (progressTracker[apiKey].error == "Invalid login credentials") {
                        return;
                    } else {
                        console.log(errorData);    
                    }
                    reject("Script failed with code: " + code);
                    return;
                }

                // Resolve the promise on a successful completion
                progressTracker[apiKey].status = "Script completed";
                progressTracker[apiKey].progress += 1;
                progressTracker[apiKey].output.push("Script completed");
                resolve();
            } else {
                reject("Script was told to close!");
                progressTracker[apiKey].status = "Failed";
                progressTracker[apiKey].output.push("Script told to close by server");
                progressTracker[apiKey].error = "Script told to close by server";
            }
        });
    });
}

async function updateDatabase(courses, userID) {
    return new Promise(async (resolve, reject) => {
        for (course of courses) {
            // Update the course
            let courseId = await DB.updateCourse(course, userID).then((courseID) => {
                return courseID;
            }).catch((err) => {
                reject(err);
            });

            // Make sure there are assignments to add/update
            if (course.assignments != null) {
                // Update the assignments
                for (assignment of course.assignments) {
                    // Get the submission URL
                    if (assignment.submissions == null) {
                        submissionURL = null;
                    } else {
                        submissionURL = assignment.submissions.url;
                    }

                    // Update the assignment
                    let assignmentID = await DB.updateAssignment({
                        link: assignment.link,
                        uid: assignment.uid,
                        name: assignment.name,
                        due: assignment.due,
                        instructions: assignment.instructions,
                        gradeUID: assignment.grade ? assignment.grade.uid : null,
                        courseID: courseId,
                        submissionURL: submissionURL,
                        userID: userID
                    }).then((assignmentID) => {
                        return assignmentID;
                    }).catch((err) => {
                        reject(err);
                    });

                    // Make sure there are attachments to add/update
                    if (assignment.attachments != null) {
                        // Update the attachments
                        for (attachment of assignment.attachments) {
                            if (attachment.link == null) {
                                continue;
                            }
                            // Update the attachment
                            await DB.updateAttachment({
                                assignmentID: assignmentID,
                                link: attachment.link,
                                name: attachment.name,
                                size: attachment.size
                            }).catch((err) => {
                                reject(err);
                            });
                        }
                    }

                    

                    // Make sure there are submissions to add/update
                    if (assignment.submissions == null) {
                        continue;
                    } else if (assignment.submissions.submissions == null) {
                        continue;
                    }

                    // Update the submissions
                    for (submission of assignment.submissions.submissions) {
                        // Update the submission
                        let submissionID = await DB.updateSubmission({
                            assignmentID: assignmentID,
                            d2lSubmissionID: submission.id,
                            comment: submission.comment,
                            date: submission.date
                        }).then((submissionID) => {
                            return submissionID;
                        }).catch((err) => {
                            reject(err);
                        });

                        // Make sure there are attachments to add/update
                        if (submission.files == null) {
                            continue;
                        }
                        
                        // Update the attachments
                        for (attachment of submission.files) {
                            if (attachment.link == null) {
                                continue;
                            }
                            // Update the attachment
                            await DB.updateAttachment({
                                submissionID: submissionID,
                                link: attachment.link,
                                name: attachment.name,
                                size: attachment.size
                            }).catch((err) => {
                                reject(err);
                            });
                        }
                    }
                }
            }
            

            // Make sure there are grades to add/update
            if (course.grades == null) {
                continue;
            }

            // Update the grades
            for (grade of course.grades) {
                if (grade.name == null || grade.uid == null || courseId == null) {
                    console.log(`Mishap adding grade. Name: ${grade.name} | UID: ${grade.uid} | ClassID: ${classID}`);
                    continue;
                } 

                // Update the grade
                await DB.updateGrade({
                    classID: courseId,
                    name: grade.name,
                    grade: grade.grade,
                    achieved: grade.pointsAchieved,
                    max: grade.pointsMax,
                    weight: grade.weightMax,
                    uid: grade.uid,
                    userID: userID
                }).catch((err) => {
                    reject(err);
                });
            }
        }

        // Resolve the promise
        resolve();
    });
}

async function updateUserData(userID, apiKey, name) {
    return new Promise(async (resolve, reject) => {
        // Update the progress tracker
        progressTracker[apiKey] = {
            "started": new Date(),
            "status": "initializing",
            "progress": 1,
            "steps": 5,
            "output": [
                "Initializing..."
            ],
            "error": "",
            "ETA": 3600000
        };

        /////////////////////////////////
        // Get the user and their data //
        /////////////////////////////////

        // Get the user
        let user = await DB.getUser({ apiKey: apiKey }).then((user) => {
            // Check to see how many users were found
            if (user.length == 1) {
                return user[0];
            } else if (user.length == 0) {
                reject(`No user associated with apiKey: ${apiKey}`);
            } else {
                reject("Multiple users found while getting user");
            }

        }).catch((err) => {
            // Log any errors to the console and throw a new error
            console.log(`Get user error: ${err}`);
            if (err.message.indexOf("ECONNRESET") > -1) {
                reject("Connection issue with database while getting user");
            }
        });

        // Get users login information
        if (user.d2lEmail == null || user.d2lPassword == null) {
            reject(`User missing login information ${user.d2lEmail} | ${user.d2lPassword} | ${user.d2lLink} | ${user.username}`);
        }

        // Update progress tracker
        progressTracker[apiKey].status = "Getting user data";
        progressTracker[apiKey].progress += 1;
        progressTracker[apiKey].output.push("Obtained user data");

        ////////////////////
        // Run the script //
        ////////////////////
        // Setup the unique course path and scripts path
        const scriptPath = "../../courseScraper/main.py";
        const coursePath = __dirname+`/${apiKey}.json`;

        // Setup args
        let args = [
            scriptPath, 
            user.d2lEmail, 
            security.decrypt(user.d2lPassword), 
            coursePath,
            user.d2lLink
        ];

        // Run the script with the args
        runScript(args, apiKey).then(() => {
            /////////////////////////
            // Update the database //
            /////////////////////////
            // Update the progress tracker
            progressTracker[apiKey].status = "Updating database";
            progressTracker[apiKey].progress += 1;
            progressTracker[apiKey].output.push("Updating database");

            // Get the json data
            let jsonData;
            let courses = null;

            // Read from the file
            jsonData = fs.readFileSync(coursePath, "utf-8");
            courses = JSON.parse(jsonData);
            
            // Check if the courses were found
            if (courses == null || courses == undefined) {
                reject("No courses found in JSON file");
            }

            // Update the database
            updateDatabase(courses, userID).catch((err) => {
                reject(err);
            });

            // Update the progress tracker
            progressTracker[apiKey].status = "Completed";
            progressTracker[apiKey].progress += 1;
            progressTracker[apiKey].output.push("Completed");
            console.log(`Update completed for ${name}`);

            // Clear the progress tracker after 5 minutes
            setTimeout(() => {
                // Remove the tracker
                delete progressTracker[apiKey];

                // Remove the file
                if (fs.existsSync(coursePath)) {
                    fs.unlinkSync(coursePath);
                }
            }, timeToRemoveProgressTracker/2);
        }).catch((err) => {
            reject(err);
        });
    });
}

// --------------------------------
//   Functions to handle requests
// --------------------------------

// Log a request
router.use((req, res, next) => {
    if (req.url == "/classes/") {
        req.url = req.url.replace("/classes/", "/");
    } else if (req.url == "/classes") {
        req.url = req.url.replace("/classes", "/");
    }

    next();
});

// Update the users data
router.post("/update", async (req, res, next) => {
    // Get data out of token
    const token = req.headers.authorization.split(" ")[1];
    const data = helper.verifyToken(token);

    const user = await DB.getUser({ userID: data.data.userID }).then((user) => {
        // Check to see how many users were found
        if (user.length == 1) {
            return user[0];
        } else if (user.length == 0) {
            res.status(404).json({
                "status": "failed",
                "message": "No users found"
            });
        } else {
            res.status(500).json({
                "status": "failed",
                "message": "Multiple users found while getting user"
            });
        }
    }).catch((err) => {
        res.status(500).json({
            "status": "failed",
            "message": "Error occurred while getting user"
        });
        console.log(err);
    });

    // Deal with if the user is already updating their data
    if (progressTracker[data.data.apiKey]) {
        if (user.updated < progressTracker[data.data.apiKey].started) {
            res.status(409).json({
            "status": "failed",
            "message": "Update already in progress",
            "time": progressTracker[data.data.apiKey].started
            });
            return;
        } else {
            // If the user updated some data and is deciding to run the 
            // update again then stop the previous update if its running
            // and remove the progress tracker
            console.log("Stopping previous update");
            if (!progressTracker[data.data.apiKey].script.killed) {
                progressTracker[data.data.apiKey].script.kill("SIGKILL");
            }
            delete progressTracker[data.data.apiKey];
        }
    }

    // Send the response
    res.status(200).json({
        "status": "success",
        "message": "Update started",
        "time": new Date()
    });

    console.log(`Starting update of classes for ${data.data.username}`);

    // Run the update function 
    updateUserData(data.data.userID, data.data.apiKey, data.data.username).catch((err) => {
        console.log(`Error occurred while updating ${data.data.username} Error: ${err}`);
    });
});


// Update grades that the user edits
router.post("/editGrades", async (req, res, next) => {
    // Get data out of token
    const token = req.headers.authorization.split(" ")[1];
    const data = helper.verifyToken(token);

    if (progressTracker[data.data.apiKey]) {
        res.status(409).json({
            "status": "failed",
            "message": "Update already in progress"
        });
        return;
    }

    // Get the userID
    const userID = data.data.userID;

    // Get the grades and className
    const grades = req.body.grades;
    const className = req.body.className;


    // Check the data to see if the grades or the class name is not there
    if (!grades || !className) {
        res.status(400).json({
            "status": "failed",
            "message": "No grades found"
        });
        return;
    }

    // Check the grades to see if they are valid
    for (var i=0; i<grades.length; i++) {
        if (grades[i].grade === null || grades[i].grade === "") {
            res.status(400).json({
                "status": "failed",
                "message": "Invalid grade data"
            });
            return;
        
        // Check if the gradUID is set. If not set one
        } else if (!grades[i].uid) {
            // Convert the name and class name to individual numbers
            const nameAsNumber = grades[i].name.replace(" ", "_").split("").reduce(
                (acc, char) => acc + char.charCodeAt(0), 
                0
            );
            
            const classNameAsNumber = className.replace(" ", "_").split("").reduce(
                (acc, char) => acc + char.charCodeAt(0), 
                0
            );

            // Set the uid
            grades[i].uid = nameAsNumber + classNameAsNumber;

            // Set a flag
            grades[i].custom = true;
        }
    }

    console.log("Updating grades for " + data.data.username + ". Updating class: " + className);

    // Get the classID
    var classID = await DB.getClass({userID: userID, name: className}).catch((err) => {
        res.status(400).json({
            "status": "failed",
            "message": "Failed to get classID"
        });
    });
    classID = classID[0].classID;

    // Update the grades
    var failed = 0;
    var errors = [];
    for (var i=0; i<grades.length; i++) {
        if (grades[i].name == null || grades[i].name == "") {
            failed++;
            errors.push("No name found");
            continue;
        }
        DB.updateGrade({
            classID: classID,
            name: grades[i].name,
            grade: grades[i].grade,
            achieved: grades[i].achieved,
            max: grades[i].max,
            weight: grades[i].weight,
            uid: grades[i].uid,
            userID: userID,
            custom: grades[i].custom
        }).catch((err) => {
            failed++;
            errors.push(err);
            console.log(err);
        });
    }

    // Send response
    if (failed == 0 && errors.length == 0) {
        res.status(200).json({
            "status": "success",
            "message": "Grades updated"
        });
    } else {
        res.status(400).json({
            "status": "failed",
            "message": "Failed to update grades",
            "errors": errors
        });
    }
});


// Get the progress of the update
router.get("/update", (req, res, next) => {
    // Get the token
    const token = req.headers.authorization.split(" ")[1];

    // Decode the token
    const data = helper.verifyToken(token);

    // Send the current progress back
    if (!progressTracker[data.data.apiKey]) {
        res.status(404).json({
            "status": "failed",
            "message": "No progress found"
        });
        return;
    }
    
    // Send data back
    let progressData = progressTracker[data.data.apiKey];
    res.status(200).json(
        {
            "status": progressData.status,
            "progress": progressData.progress,
            "steps": progressData.steps,
            "output": progressData.output,
            "error": progressData.error,
            "ETA": progressData.ETA,
            "started": progressData.started
        }
    );
});


router.get("/", async (req, res) => {
    // Get the token
    const token = req.headers.authorization.split(" ")[1];

    // Decode the token
    const data = helper.verifyToken(token);

    // Make courses list
    let courses = [];

    // Get the classes
    let courseIDs = await DB.getUserToClassLink({ userID: data.data.userID });
    
    if (!courseIDs) {
        res.status(200).json({
            "status": "Failed",
            "courses": []
        });
        return;
    } else if (courseIDs == null) {
        res.status(200).json({
            "status": "success No courses found",
            "courses": []
        });
        return;
    }


    // Go through the class IDs
    for (let i = 0; i < courseIDs.length; i++) {
        // Get the current courseID
        courseID = courseIDs[i].classID;

        // Get the course
        DB.getClass({ classID: courseID })
        .then((course) => {
            // Add the course to the courses list
            courses.push(course[0]);
        });
    }

    // Wait for all courses to be added
    while (courses.length < courseIDs.length) {
        await new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, 100);
        });
    }

    // Send the courses back 
    res.status(200).json({
        "status": "success",
        "courses": courses
    }); 
});

router.get("/allData", async (req, res) => {
    // Get the token
    const token = req.headers.authorization.split(" ")[1];

    // Decode the token
    const data = helper.verifyToken(token);

    // Get the data
    //DB.getAllCourseData(data.data.userID)
    DB.getAllDataFast(data.data.userID)
    .then((allData) => {
        res.status(200).json({
            "status": "success",
            "data": allData
        });
    })
    .catch((err) => {
        res.status(200).json({
            "status": "failed",
            "message": err
        });
    });
});

router.get("/assignments/:classID", async (req, res) => {
    // Get the token
    const token = req.headers.authorization.split(" ")[1];

    // Decode the token
    const data = helper.verifyToken(token);

    // Get the course code
    const classID = req.params.classID;

    // Get the assignments
    const result = await DB.getClassAssignments(classID)

    if (!result) {
        res.status(200).json({
            "status": "failed",
            "assignments": []
        });
        return;
    }

    // Get the grade for the assignment
    let assignments = [];
    for (let i = 0; i < result.length; i++) {
        // Get the grade
        let grade;
        DB.getGrade({ userID: data.data.userID, assignmentID: result[i].assignmentID })
        .then((result) => {
            // Set the grade
            grade = result[0].grade;
        }).catch((error) => {
            // Log the error
            console.log(error);
            grade = null;
        });

        // Set the grade
        result[i].grade = grade;
        assignments.push(result[i]);
    }

    // Get all the submissions for the assignments
    for (let i = 0; i < assignments.length; i++) {
        // Get the submissions
        let submissions = await DB.getSubmissions({ assignmentID: assignments[i].assignmentID });

        // Add the submissions to the assignment
        assignments[i].submissions = submissions;
    }

    // Wait for all assignments to be added
    while (assignments.length < result.length) {
        await new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, 100);
        });
    }

    // Send the course back
    res.status(200).json({
        "status": "success",
        "assignments": assignments
    });
});

module.exports = router;