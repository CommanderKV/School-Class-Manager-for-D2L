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


// Features to add:
// - Add a estimated time of completion 
//   based off of the averagetime time 
//   it takes to load a course.
let progressTracker = {};

// ---------------------
//   Utility functions
// ---------------------
async function runUpdate(userID, apiKey) {
    // Check parameters
    if (!helper.checkParams([userID, apiKey])) {
        throw new Error(`classes.runUpdate: No arguments set ${userID} | ${apiKey}`);
    }

    // Setup progress tracker
    progressTracker[apiKey] = {
        "status": "initalizing",
        "progress": 1,
        "steps": 5,
        "output": [
            "Initalizing..."
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
    .catch((err) => {console.log(err); throw err;})

    // Check if the user was found
    if (!user) {
        // Update the progress tracker if we have no users
        progressTracker[apiKey].status = "Failed";
        progressTracker[apiKey].output.push("User not found");
        progressTracker[apiKey].error = "User not found";

        // Clear the progress tracker after 5 minutes
        setTimeout(() => {
            // Remove tracker
            delete progressTracker.apiKey;
        }, 5 * 60 * 1000);
        return;

    // Check if multiple users were found
    } else if (user.length > 1) {
        progressTracker[apiKey].status = "Failed";
        progressTracker[apiKey].output.push("Multiple users found");
        progressTracker[apiKey].error = "Multiple users found";

        // Clear the progress tracker after 5 minutes
        setTimeout(() => {
            delete progressTracker.apiKey;
        }, 5 * 60 * 1000);
        return;
    }

    // Setup the course path
    const coursePath = __dirname+`\\${apiKey}.json`;

    // Setup args
    let args = [
        scriptPath, 
        user.d2lEmail, 
        user.d2lPassword, 
        coursePath
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
            const pythonProcess = child_process.spawn("python", args);
            
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
                progressTracker[apiKey].error = data.toString();
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
                        delete progressTracker.apiKey;
                        
                        // Remove the file
                        fs.unlinkSync(coursePath);
                    }, 5 * 60 * 1000);

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
            let jsonData = fs.readFileSync(jsonDir, "utf-8");
            let courses = JSON.parse(jsonData);
            console.log(courses);

            // Add all courses and link it to the user
            courses.forEach((course) => {
                
                // Update the course
                DB.updateCourse(course, userID)
                .catch((err) => {
                    console.log(err);
                    progressTracker[apiKey].status = "Failed";
                    progressTracker[apiKey].output.push(err);
                    progressTracker[apiKey].error = err;

                    // Clear the progress tracker after 5 minutes
                    setTimeout(() => {
                        // Delete tracker
                        delete progressTracker.apiKey;

                        // Remove the file
                        fs.unlinkSync(coursePath);
                    }, 5 * 60 * 1000);
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
                                name: assignment.NAME,
                                due: assignment.DUE,
                                instructions: assignment.INSTRUCTIONS,
                                grade: assignment.GRADE,
                                courseID: courseID,
                                submissionURL: submissionURL,
                                userID: userID
                            })
                            .then((assignmentID) => {

                                // Add all attachments
                                if (assignment.ATTACHMENTS != null) {
                                    assignment.ATTACHMENTS.forEach((attachment) => {
                                        
                                        // Add the attachment
                                        DB.updateAttachment({
                                            assignmentID: assignmentID,
                                            link: attachment.LINK,
                                            name: attachment.NAME,
                                            size: attachment.SIZE,
                                        })
                                        .catch((err) => {console.log(err);});
                                    });

                                // Add all the submissions
                                } else if (assignment.SUBMISSIONS.SUBMISSIONS != null) {
                                    assignment.SUBMISSIONS.SUBMISSIONS.forEach((submission) => {

                                        // Add the submission
                                        submission = DB.updateSubmission({
                                            assignmentID: assignmentID,
                                            d2lSubmissionID: submission.ID, 
                                            comment: assignment.COMMENT,
                                            date: submission.DATE,
                                        }).then((submissionID) => {

                                            // Add all the attachments
                                            if (submission.FILES == null) {
                                                return;
                                            }
                                            submission.FILES.forEach((attachment) => {

                                                // Add the attachment
                                                DB.updateSubmissionAttachment(attachment, submissionID=submissionID)
                                                .catch((err) => {console.log(err);})

                                            });
                                        }).catch((err) => {console.log(err);});
                                    });
                                }
                            })
                            .catch((error) => {
                                progressTracker[apiKey].status = "Failed";
                                progressTracker[apiKey].output.push(error);
                                progressTracker[apiKey].error = error;

                                // Clear the progress tracker after 5 minutes
                                setTimeout(() => {
                                    // Delete tracker
                                    delete progressTracker.apiKey;

                                    // Remove the file
                                    try {
                                        fs.unlinkSync(coursePath);
                                    } catch (err) {
                                        console.log(err);
                                    }
                                }, 5 * 60 * 1000);

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

            // Clear the progress tracker after 5 minutes
            setTimeout(() => {
                // Remove the tracker
                delete progressTracker.apiKey;

                // Remove the file
                fs.unlinkSync(coursePath);
            }, 5 * 60 * 1000);
        })
        .catch((err) => {
            console.log(err);
            progressTracker[apiKey].status = "Failed";
            progressTracker[apiKey].output.push(err);
            progressTracker[apiKey].error = err;

            // Clear the progress tracker after 5 minutes
            setTimeout(() => {
                // Remove the tracker
                delete progressTracker.apiKey;

                // Remove the file
                fs.unlinkSync(coursePath);
            }, 5 * 60 * 1000);
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

    console.log("Starting update of classes");

    // Run the update function 
    runUpdate(
        data.data.userID, 
        `${data.data.apiKey}`
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

    let assignments = [];
    for (let i = 0; i < result.length; i++) {
        let grade;
        DB.getGrade({ userID: data.data.userID, assignmentID: result[i].assignmentID })
        .then((result) => {
            grade = result[0].grade;
        }).catch((error) => {
            console.log(error);
            grade = null;
        });
        result[i].grade = grade;
        assignments.push(result[i]);
    }


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