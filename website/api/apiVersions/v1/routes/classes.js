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

let progressTracker = {};

// ---------------------
//   Utility functions
// ---------------------
async function runUpdate(username, password, userID, apiKey) {
    // Setup progress tracker
    progressTracker[apiKey] = {
        "status": "initalizing",
        "progress": 1,
        "steps": 6,
        "output": [],
        "error": ""
    };

    // Get the scripts path
    let scriptPath = "../../courseScraper/main.py";

    // Get users d2l username and password
    let user = await DB.getUser(userID)
    .then((user) => {return user;})
    .catch((err) => {console.log(err); return null;})
    if (!user) {
        progressTracker[apiKey].status = "Failed";
        progressTracker[apiKey].output.push("User not found");
        progressTracker[apiKey].error = "User not found";

        // Clear the progress tracker after 5 minutes
        setTimeout(() => {
            delete progressTracker.apiKey;
        }, 5 * 60 * 1000);
        return;
    }

    // Setup the course path
    let coursePath = __dirname+`\\${apiKey}.json`;

    // Setup args
    let args = [
        scriptPath, 
        username, 
        password, 
        coursePath
    ];

    // Update the progress tracker
    progressTracker[apiKey].status = "starting"
    progressTracker[apiKey].progress += 1;


    // Run the script
    return new Promise(() => {
        new Promise((resolve, reject) => {
            // Define vars
            let buffer = "";
            
            // Run the script
            const pythonProcess = child_process.spawn("python", args);
            
            // Update the progress tracker
            progressTracker[apiKey].status = "running";
            progressTracker[apiKey].progress += 1;

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
                console.log(data.toString());
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
                    progressTracker[apiKey].status = "Failed";
                    progressTracker[apiKey].output.push("Script failed");
                    progressTracker[apiKey].error = "Script failed";
                    reject("Script failed");
                    return;
                }
                progressTracker[apiKey].status = "Script completed";
                progressTracker[apiKey].progress += 1;
                resolve();
            });
        })

        // After the script is done, update the database
        .then(() => {
            // Update the progress tracker
            progressTracker[apiKey].status = "Updating database";
            progressTracker[apiKey].progress += 1;
            
            // Get the json data
            let jsonDir = coursePath;
            let jsonData = fs.readFileSync(jsonDir, "utf-8");
            let courses = JSON.parse(jsonData);

            // Add all courses and link it to the user
            courses.forEach((course) => {
                
                // Update the course
                DB.updateCourse(course, userID).then((courseID) => {

                    // Add all assignments
                    course.ASSIGNMENTS.forEach((assignment) => {
                        
                        // Add the assignment
                        DB.updateAssignment(assignment, assignment.SUBMISSIONS.URL, courseID).then((assignmentID) => {

                            // Add all attachments
                            assignment.ATTACHMENTS.forEach((attachment) => {
                                
                                // Add the attachment
                                DB.updateAttachment(attachment, assignmentID=assignmentID)
                                .catch((err) => {console.log(err);})
                            });

                            // Add all the submissions
                            assignment.SUBMISSIONS.SUBMISSIONS.forEach((submission) => {

                                // Add the submission
                                submission = DB.updateSubmission(submission, assignment.NAME).then((submissionID) => {

                                    // Add all the attachments
                                    submission.FILES.forEach((attachment) => {

                                        // Add the attachment
                                        DB.updateSubmissionAttachment(attachment, submissionID=submissionID)
                                        .catch((err) => {console.log(err);})

                                    });
                                }).catch((err) => {console.log(err);});
                            });
                        })
                        .catch((err) => {
                            console.log(err);
                            progressTracker[apiKey].status = "Failed";
                            progressTracker[apiKey].output.push(err);
                            progressTracker[apiKey].error = err;

                            // Clear the progress tracker after 5 minutes
                            setTimeout(() => {
                                delete progressTracker.apiKey;
                            }, 5 * 60 * 1000);
                        });
                    });
                })
                .catch((err) => {
                    console.log(err);
                    progressTracker[apiKey].status = "Failed";
                    progressTracker[apiKey].output.push(err);
                    progressTracker[apiKey].error = err;

                    // Clear the progress tracker after 5 minutes
                    setTimeout(() => {
                        delete progressTracker.apiKey;
                    }, 5 * 60 * 1000);
                });
            });

            // Update the progress tracker
            progressTracker[apiKey].status = "Completed";
            progressTracker[apiKey].progress += 1;

            // Clear the progress tracker after 5 minutes
            setTimeout(() => {
                delete progressTracker.apiKey;
            }, 5 * 60 * 1000);
        })
        .catch((err) => {
            console.log(err);
            progressTracker[apiKey].status = "Failed";
            progressTracker[apiKey].output.push(err);
            progressTracker[apiKey].error = err;

            // Clear the progress tracker after 5 minutes
            setTimeout(() => {
                delete progressTracker.apiKey;
            }, 5 * 60 * 1000);
        });
    });
}

// --------------------------------
//   Functions to handle requests
// --------------------------------

// Log a request
router.use((req, res, next) => {
    req.url = req.url.replace("/classes/", "/");
    //console.log(`Request made to classes: ${req.url}`);
    next();
});

router.post("/update", (req, res, next) => {
    if (
        !req.headers.d2lusername || 
        !req.headers.d2lpassword || 
        !req.headers.userid ||
        !req.headers.apikey
    ) {
        console.log(req.headers);
        if (!req.headers.APIKey) {
            res.status(400).json({
                "status": "failed",
                "message": "Missing apiKey"
            });
            console.log("Missing apiKey")

        } else if (!req.headers.d2lUsername) {
            res.status(400).json({
                "status": "failed",
                "message": "Missing d2lUsername"
            });
            console.log("Missing d2lUsername")

        } else if (!req.headers.d2lPassword) {
            res.status(400).json({
                "status": "failed",
                "message": "Missing d2lPassword"
            });
            console.log("Missing d2lPassword")

        } else if (!req.headers.userID) {
            res.status(400).json({
                "status": "failed",
                "message": "Missing userID"
            });
            console.log("Missing userID")
        }
        
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
        req.headers.d2lusername, 
        req.headers.d2lpassword, 
        req.headers.userid, 
        req.headers.apikey
    ).catch((err) => {
        console.log(`Update: ${err}`);
    });

    
});

router.get("/update", (req, res, next) => {
    // Send the current progress back
    if (!progressTracker[req.headers.apikey]) {
        res.status(404).json({
            "status": "failed",
            "message": "No progress found"
        });
        return;
    }

    res.status(200).json(progressTracker[req.headers.apikey]);
});


router.get("/", (req, res) => {
    console.log("Getting functions");
    res.status(200).json({
        "functions": {
            "update": [
                "/:userID"
            ]
        }
    });
});

module.exports = router;