-- Make database
-- CREATE DATABASE classes;
USE classes;

DROP TABLE IF EXISTS 
`GradesLinkToClasses`,
`Grades`,
`AttachmentLinkToSubmission`, 
`AttachmentLinkToAssignment`,
`Assignments`, 
`Attachments`, 
`Classes`, 
`Feedback`, 
`Submissions`;
-- `Users`,

-- Make tables
CREATE TABLE Users (
    userID INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(200) DEFAULT NULL,
    d2lEmail VARCHAR(200) DEFAULT NULL,
    d2lPassword VARCHAR(255) DEFAULT NULL,
    d2lLink VARCHAR(255) DEFAULT NULL,
    APIKey CHAR(36) DEFAULT (UUID()) NOT NULL,
    updated DATETIME DEFAULT NOW() NOT NULL
) AUTO_INCREMENT = 1000;


CREATE TABLE Classes (
    classID INT AUTO_INCREMENT PRIMARY KEY,
    userID INT NOT NULL,
    closed BOOLEAN NOT NULL DEFAULT FALSE,
    link VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    courseCode VARCHAR(100) NOT NULL,
    termShort VARCHAR(20) NOT NULL,
    termLong VARCHAR(100) NOT NULL,
    syllabusURL TEXT DEFAULT NULL,
    assignmentsURL TEXT DEFAULT NULL,
    FOREIGN KEY (userID) REFERENCES Users(userID)
) AUTO_INCREMENT = 1000;

CREATE TABLE Grades (
    gradeID INT AUTO_INCREMENT PRIMARY KEY,
    uId INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    grade FLOAT,
    achieved FLOAT,
    max FLOAT,
    weight FLOAT DEFAULT 1,
    custom BOOLEAN DEFAULT FALSE NOT NULL
) AUTO_INCREMENT = 1;

CREATE TABLE GradesLinkToClasses (
    gradeLinkID INT AUTO_INCREMENT PRIMARY KEY,
    gradeID INT NOT NULL,
    classID INT NOT NULL,
    FOREIGN KEY (gradeID) REFERENCES Grades(gradeID),
    FOREIGN KEY (classID) REFERENCES Classes(classID)
);

CREATE TABLE Assignments (
    assignmentID INT AUTO_INCREMENT PRIMARY KEY,
    classID INT NOT NULL,
    uid BIGINT NOT NULL,
    link VARCHAR(255) DEFAULT NULL,
    submissionURL VARCHAR(255) DEFAULT NULL,
    name VARCHAR(100) NOT NULL,
    dueDate DATETIME NOT NULL,
    instructions TEXT DEFAULT NULL,
    gradeUID INT,
    FOREIGN KEY (classID) REFERENCES Classes(classID)
) AUTO_INCREMENT = 1;

CREATE TABLE Submissions (
    submissionID INT AUTO_INCREMENT PRIMARY KEY,
    assignmentID INT NOT NULL,
    comment VARCHAR(1000) DEFAULT NULL,
    d2lSubmissionID INT NOT NULL,
    date DATETIME DEFAULT NULL,
    FOREIGN KEY (assignmentID) REFERENCES Assignments(assignmentID)
) AUTO_INCREMENT = 1;

CREATE TABLE Feedback (
    feedbackID INT AUTO_INCREMENT PRIMARY KEY,
    submissionID INT NOT NULL,
    html VARCHAR(255) DEFAULT NULL,
    date DATETIME NOT NULL,
    FOREIGN KEY (submissionID) REFERENCES Submissions(submissionID)
) AUTO_INCREMENT = 1;

CREATE TABLE Attachments (
    attachmentID INT AUTO_INCREMENT PRIMARY KEY,
    link VARCHAR(255) NOT NULL,
    size VARCHAR(15) NOT NULL,
    name VARCHAR(255) NOT NULL
) AUTO_INCREMENT = 1;

CREATE TABLE AttachmentLinkToSubmission (
    AttachmentLinkToSubmissionID INT AUTO_INCREMENT PRIMARY KEY,
    attachmentID INT NOT NULL,
    submissionID INT NOT NULL,
    FOREIGN KEY (attachmentID) REFERENCES Attachments(attachmentID),
    FOREIGN KEY (submissionID) REFERENCES Submissions(submissionID)
);

CREATE TABLE AttachmentLinkToAssignment (
    AttachmentLinkToAssignmentID INT AUTO_INCREMENT PRIMARY KEY,
    attachmentID INT NOT NULL,
    assignmentID INT NOT NULL,
    FOREIGN KEY (attachmentID) REFERENCES Attachments(attachmentID),
    FOREIGN KEY (assignmentID) REFERENCES Assignments(assignmentID)
);


SELECT * FROM Classes;

SELECT * FROM Attachments;

SELECT * FROM Assignments;

SELECT * FROM Assignments WHERE classID = 1001;

SELECT * FROM Submissions;

DELETE FROM GradesLinkToClasses WHERE gradeID = 400;
DELETE FROM Grades WHERE gradeID = 400;
SELECT * FROM Grades;

SELECT * FROM GradesLinkToAssignments;

SELECT * FROM GradesLinkToClasses;

SELECT * FROM Users;

SELECT LAST_INSERT_ID();

SELECT * FROM Assignments
LEFT JOIN Classes ON Classes.classID = Assignments.classID
LEFT JOIN Users ON Classes.userID = Users.userID
WHERE 
	Assignments.uid = 2680 AND 
	Assignments.classID = 1001 AND 
    Classes.userID = 1000;


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
LEFT JOIN Assignments ON Classes.classID = Assignments.classID      -- Get the assignments details
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
LEFT JOIN (
    SELECT
        Classes.classID,
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'uid', Grades.uId,				-- Grade uid
                'name', Grades.name,			-- Grade name (A, B, C etc)
                'grade', Grades.grade,			-- Grade achieved (90%) etc
                'achieved', Grades.achieved,	-- Grade points achieved
                'max', Grades.max,				-- Grade points maximum
                'weight', Grades.weight,		-- Grade weight maximum
                'custom', Grades.custom			-- Is this grade custom?
            )
        ) AS classGrades
    FROM Grades
    LEFT JOIN GradesLinkToClasses ON GradesLinkToClasses.gradeID = Grades.gradeID
    LEFT JOIN Classes ON GradesLinkToClasses.classID = Classes.classID
    GROUP BY Classes.classID
) AS classGrades ON Classes.classID = classGrades.classID
WHERE Classes.userID = 1000 -- ?
GROUP BY 
    Classes.classID,
    Classes.name,
    Classes.courseCode,
    Classes.link,
    Classes.termShort,
    Classes.closed,
    Classes.assignmentsURL,
    Classes.syllabusURL,
    classGrades.classGrades;


