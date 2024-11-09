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


// Features to add:
// - Add a estimated time of completion 
//   based off of the average time 
//   it takes to load a course.
let progressTracker = {};
let timeToRemoveProgressTracker = 2 * 60 * 1000;

// ---------------------
//   Utility functions
// ---------------------
async function runUpdate(userID, apiKey, userNameInput) {
    var fails = 0;

    // Check parameters
    if (!helper.checkParams([userID, apiKey])) {
        throw new Error(`classes.runUpdate: No arguments set ${userID} | ${apiKey}`);
    }

    // Setup progress tracker
    progressTracker[apiKey] = {
        "status": "initializing",
        "progress": 1,
        "steps": 5,
        "output": [
            "Initializing..."
        ],
        "error": ""
    };

    // Get the scripts path
    let scriptPath = "../../courseScraper/main.py";

    // Get users d2l username and password
    const user = await DB.getUser({ apiKey: apiKey })
    .then((user) => {
        if (user.length == 1) {
            return user[0];
        } else if (user.length == 0) {
            return null;
        } else {
            throw new Error("Multiple users found"); // Should never happen
        }
    })
    .catch((err) => {
        console.log(err);
        if (err.message.indexOf("ECONNRESET") > -1) {
            throw new Error("Connection issue with database");
        }
    })

    // Check if the user was found
    if (!user) {
        // Log the error
        console.log(`User not found "${user}" apiKey: ${apiKey}`);

        // Update the progress tracker if we have no users
        progressTracker[apiKey].status = "Failed";
        progressTracker[apiKey].output.push("User not found");
        progressTracker[apiKey].error = "User not found";

        // Clear the progress tracker after 5 minutes
        setTimeout(() => {
            // Remove tracker
            delete progressTracker[apiKey];
        }, timeToRemoveProgressTracker);
        return;

    // Check if multiple users were found
    } else if (user.length > 1) {
        progressTracker[apiKey].status = "Failed";
        progressTracker[apiKey].output.push("Multiple users found");
        progressTracker[apiKey].error = "Multiple users found";

        // Clear the progress tracker after 5 minutes
        setTimeout(() => {
            delete progressTracker[apiKey];
        }, timeToRemoveProgressTracker);
        return;
    
    // Check if the user has the required data
    } else if (!user.d2lEmail || !user.d2lPassword || !user.d2lLink) {
        progressTracker[apiKey].status = "Failed";
        progressTracker[apiKey].output.push("User missing required data");
        progressTracker[apiKey].error = "User missing required data";

        // Clear the progress tracker after 1 minute
        setTimeout(() => {
            // Remove tracker
            delete progressTracker[apiKey];
        }, timeToRemoveProgressTracker/2);
        return;
    }

    // Setup the course path
    const coursePath = __dirname+`\\${apiKey}.json`;

    // Setup args
    let args = [
        scriptPath, 
        user.d2lEmail, 
        security.decrypt(user.d2lPassword), 
        coursePath,
        user.d2lLink
    ];


    // Update the progress tracker
    progressTracker[apiKey].status = "starting"
    progressTracker[apiKey].progress += 1;
    progressTracker[apiKey].output.push("Starting script");

    return new Promise((masterResolve, masterReject) => {
        // Run the script
        new Promise((resolve, reject) => {
            // Define vars
            let buffer = "";
            
            // Run the script
            const pythonProcess = child_process.spawn("python3", args);
            
            // Update the progress tracker
            progressTracker[apiKey].status = "running";
            progressTracker[apiKey].progress += 1;
            progressTracker[apiKey].output.push("Script started");

            // When the script outputs data
            pythonProcess.stdout.on("data", (data) => {
                // Add to buffer
                buffer += data.toString();
                let lines = buffer.split("\n");
                buffer = lines.pop();

                // Go through each line
                lines.forEach((line) => {
                    // Check for the notice of how many courses were found
                    if (line.startsWith("[Notice] Found")) {
                        // Adjust the progress tracker
                        progressTracker[apiKey].steps += parseInt(line.split(" ")[2]);
                    
                    // Check for the notice of a course being loaded
                    } else if (line.startsWith("[Success]") && line.includes(" loaded!")) {
                        // Adjust the progress tracker
                        progressTracker[apiKey].progress += 1;
                    }

                    // Add the line to the output
                    progressTracker[apiKey].output.push(line);
                });
                // console.log(data.toString());
            });

            // When the script outputs an error
            pythonProcess.stderr.on("data", (data) => {
                progressTracker[apiKey].status = "Failed";
                progressTracker[apiKey].output.push(data.toString());
                progressTracker[apiKey].error = `Script sent: ${data.toString()}`;
                console.log(data.toString());
            });

            // When the script is done
            pythonProcess.on("close", (code) => {
                if (code !== 0) {
                    // Update the progress tracker
                    progressTracker[apiKey].status = "Failed";
                    progressTracker[apiKey].output.push("Script failed");
                    progressTracker[apiKey].error = "Script failed";

                    // Remove temp data in 5 minutes
                    setTimeout(() => {
                        // Delete tracker
                        delete progressTracker[apiKey];
                        
                        // Remove the file
                        fs.unlinkSync(coursePath);
                    }, timeToRemoveProgressTracker/2);

                    // Reject the promise
                    reject("Script failed");
                    return;
                }

                // Resolve the promise
                progressTracker[apiKey].status = "Script completed";
                progressTracker[apiKey].progress += 1;
                progressTracker[apiKey].output.push("Script completed");
                resolve();
            });
        })

        // After the script is done, update the database
        .then(() => {
            // Update the progress tracker
            progressTracker[apiKey].status = "Updating database";
            progressTracker[apiKey].progress += 1;
            progressTracker[apiKey].output.push("Updating database");
            
            // Get the json data
            let jsonDir = coursePath;
            let jsonData;
            let courses = null;
            try {
                jsonData = fs.readFileSync(jsonDir, "utf-8");
                courses = JSON.parse(jsonData);
                
            } catch (err) {
                console.log(err);
                progressTracker[apiKey].status = "Failed";
                progressTracker[apiKey].output.push(err);
                progressTracker[apiKey].error = `Reading JSON file encountered: ${err}`;
                masterReject("Failed to read JSON file");
            }

            if (courses == null || courses == undefined) {
                progressTracker[apiKey].status = "Failed";
                progressTracker[apiKey].output.push("No courses found");
                progressTracker[apiKey].error = `No courses found in JSON file`;
                masterReject("Failed to read JSON file");
            }

            // Add all courses and link it to the user
            courses.forEach((course) => {
                
                // Update the course
                DB.updateCourse(course, userID)
                .catch((err) => {
                    console.log(err);
                    progressTracker[apiKey].status = "Failed";
                    progressTracker[apiKey].output.push(err);
                    progressTracker[apiKey].error = `Updating course encountered: ${err}`; // Clear the progress tracker after 5 minutes
                    setTimeout(() => {
                        // Delete tracker
                        delete progressTracker[apiKey];

                        // Remove the file
                        fs.unlinkSync(coursePath);
                    }, timeToRemoveProgressTracker);
                    masterResolve("Failed to update course");
                })
                .then((courseID) => {
                    if (courseID == null) {
                        console.log("CourseID is null");
                        return;
                    } else if (courseID == undefined) {
                        console.log("CourseID is undefined");
                        return;
                    }
                    
                    // Add all assignments
                    if (course.ASSIGNMENTS != null) {
                        course.ASSIGNMENTS.forEach((assignment) => {
                            if (assignment == null) {
                                return;
                            }

                            // Add the assignment
                            if (assignment.SUBMISSIONS != null) {
                                submissionURL = assignment.SUBMISSIONS.URL
                            } else {
                                submissionURL = null
                            };
                            
                            DB.updateAssignment({
                                link: assignment.LINK, 
                                uid: assignment.UID,
                                name: assignment.NAME,
                                due: assignment.DUE,
                                instructions: assignment.INSTRUCTIONS,
                                grade: assignment.GRADE,
                                achieved: assignment.ACHIEVED,
                                max: assignment.MAX,
                                weight: assignment.WEIGHT,
                                courseID: courseID,
                                submissionURL: submissionURL,
                                userID: userID
                            })
                            .then((assignmentID) => {
                                if (assignmentID == null) {
                                    console.log(`AssignmentID(${assignmentID}) is null attempting to update assignment again`);

                                    let count = 0;
                                    while (assignmentID == null && count < 5) {
                                        count++;
                                        console.log("Attempting to update assignment again");
                                        assignmentID = DB.updateAssignment({
                                            link: assignment.LINK, 
                                            name: assignment.NAME,
                                            due: assignment.DUE,
                                            instructions: assignment.INSTRUCTIONS,
                                            grade: assignment.GRADE,
                                            achieved: assignment.ACHIEVED,
                                            max: assignment.MAX,
                                            weight: assignment.WEIGHT,
                                            courseID: courseID,
                                            submissionURL: submissionURL,
                                            userID: userID
                                        })
                                        .then((id) => {
                                            if (id == null) {
                                                console.log(`AssignmentID(${id}) is null. Attempting to update assignment again`);
                                            } else {
                                                assignmentID = id;
                                                count = 10;
                                            }
                                        })
                                        .catch((err) => {
                                            console.log(err);
                                        });
                                    }

                                    if (count == 5) {
                                        console.log("Failed to update assignment after 5 attempts");
                                        progressTracker[apiKey].status = "Warning";
                                        progressTracker[apiKey].output.push("Failed to update assignment after 5 attempts");
                                        progressTracker[apiKey].error = `Updating assignment encountered multiple errors. Suggestion: re-run update`;
                                    }
                                }

                                // Add all attachments
                                if (assignment.ATTACHMENTS != null) {
                                    assignment.ATTACHMENTS.forEach((attachment) => {
                                        
                                        // Add the attachment
                                        DB.updateAttachment({
                                            assignmentID: assignmentID,
                                            link: attachment.LINK,
                                            name: attachment.NAME,
                                            size: attachment.SIZE
                                        })
                                        .catch((err) => {console.log(err);});
                                    });
                                }

                                // Add all the submissions
                                if (assignment.SUBMISSIONS != null) {
                                    if (assignment.SUBMISSIONS.SUBMISSIONS == null) {
                                        return;
                                    }

                                    assignment.SUBMISSIONS.SUBMISSIONS.forEach((submission) => {

                                        // Add the submission
                                        DB.updateSubmission({
                                            assignmentID: assignmentID,
                                            d2lSubmissionID: submission.ID, 
                                            comment: submission.COMMENT,
                                            date: submission.DATE
                                        }).then((submissionID) => {

                                            // Add all the attachments
                                            if (submission.FILES == null) {
                                                return;
                                            }
                                            submission.FILES.forEach((attachment) => {

                                                // Add the attachment
                                                DB.updateAttachment(
                                                    {
                                                        assignmentID: assignmentID,
                                                        submissionID: submissionID,
                                                        link: attachment.LINK,
                                                        size: attachment.SIZE,
                                                        name: attachment.NAME 
                                                    })
                                                .catch((err) => {console.log(err);})

                                            });
                                        }).catch((err) => {
                                            console.log(err);
                                            if (fails == 5) {
                                                progressTracker[apiKey].status = "Warning";
                                                progressTracker[apiKey].output.push(err);
                                                progressTracker[apiKey].error = `Updating submission encountered multiple errors. Suggestion: re-run update`;
                                            }
                                            fails++;
                                        });
                                    });
                                }
                            })
                            .catch((error) => {
                                progressTracker[apiKey].status = "Failed";
                                progressTracker[apiKey].output.push(error);
                                progressTracker[apiKey].error = `Updating assignment encountered: ${error}`;

                                // Clear the progress tracker after 5 minutes
                                setTimeout(() => {
                                    // Delete tracker
                                    delete progressTracker.apiKey;

                                    // Remove the file
                                    try {
                                        fs.unlinkSync(coursePath);
                                    } catch (err) {}
                                }, timeToRemoveProgressTracker);

                                masterReject(`Failed to update assignment. courseID: ${courseID} Error: ${error} ${error.stack}`);
                            });
                        });
                    }
                });
            });

            // Update the progress tracker
            progressTracker[apiKey].status = "Completed";
            progressTracker[apiKey].progress += 1;
            progressTracker[apiKey].output.push("Completed");
            console.log(`Update completed for ${userNameInput}`);

            // Clear the progress tracker after 5 minutes
            setTimeout(() => {
                // Remove the tracker
                delete progressTracker[apiKey];

                // Remove the file
                fs.unlinkSync(coursePath);
            }, timeToRemoveProgressTracker/2);
        })
        .catch((err) => {
            if (err.toString().includes("ValueError: Invalid login")) {
                progressTracker[apiKey].status = "Login failed";
                progressTracker[apiKey].output.push(err);
                progressTracker[apiKey].error = `Login failed check credentials`;

            }else if (err.message != "Script failed") {
                console.log(err);
                progressTracker[apiKey].status = "Failed";
                progressTracker[apiKey].output.push(err);
                progressTracker[apiKey].error = `Encountered general error: ${err}`;
            }

            // Clear the progress tracker after 5 minutes
            setTimeout(() => {
                // Remove the tracker
                delete progressTracker[apiKey];

                // Remove the file
                fs.unlinkSync(coursePath);
            }, timeToRemoveProgressTracker / 3);
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

    //console.log(`Request made to classes: ${req.url}`);
    next();
});

router.post("/update", (req, res, next) => {
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

    // Send the response
    res.status(200).json({
        "status": "success",
        "message": "Update started"
    });

    console.log(`Starting update of classes for ${data.data.username}`);

    // Run the update function 
    runUpdate(
        data.data.userID, 
        `${data.data.apiKey}`,
        data.data.username
    ).catch((err) => {
        console.log(`Update: ${err}`);
        console.log(err.stack);
    });

    
});

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
    res.status(200).json(progressTracker[data.data.apiKey]);
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