-- Make database
-- CREATE DATABASE classes;
USE classes;

DROP TABLE IF EXISTS 
`GradesAssignmentsLinkToClasses`,
`GradesLinkToAssignments`,
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
    APIKey CHAR(36) DEFAULT (UUID()) NOT NULL
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
    FOREIGN KEY (userID) REFERENCES Users(userID)
) AUTO_INCREMENT = 1000;

CREATE TABLE Assignments (
    assignmentID INT AUTO_INCREMENT PRIMARY KEY,
    classID INT NOT NULL,
    uid BIGINT NOT NULL,
    link VARCHAR(255) DEFAULT NULL,
    submissionURL VARCHAR(255) DEFAULT NULL,
    name VARCHAR(100) NOT NULL,
    dueDate DATETIME NOT NULL,
    instructions TEXT DEFAULT NULL,
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

CREATE TABLE Grades (
    gradeID INT AUTO_INCREMENT PRIMARY KEY,
    userID INT NOT NULL,
    grade FLOAT,
    achieved FLOAT,
    max FLOAT,
    weight FLOAT DEFAULT 1,
    FOREIGN KEY (userID) REFERENCES Users(userID)
) AUTO_INCREMENT = 1;

CREATE TABLE GradesLinkToAssignments (
    gradeLinkID INT AUTO_INCREMENT PRIMARY KEY,
    gradeID INT NOT NULL,
    assignmentID INT NOT NULL,
    FOREIGN KEY (gradeID) REFERENCES Grades(gradeID),
    FOREIGN KEY (assignmentID) REFERENCES Assignments(assignmentID)
) AUTO_INCREMENT = 1000;


SELECT
    Classes.name AS className,          -- Class name
    Classes.courseCode,                 -- Class courseCode
    Classes.link AS classLink,          -- Class link
    Classes.termShort,                  -- Class termShort
    Classes.closed,                     -- Class closed
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
            'grade', Grades.grade,
            'weight', Grades.weight
        )
    ) AS assignments
FROM Classes                                                        -- Get the classes details
JOIN Assignments ON Classes.classID = Assignments.classID           -- Get the assignments details
LEFT JOIN GradesLinkToAssignments ON Assignments.assignmentID = GradesLinkToAssignments.assignmentID
LEFT JOIN Grades ON GradesLinkToAssignments.gradeID = Grades.gradeID
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
        DISTINCT Submissions.assignmentID,                                       -- Assignment ID
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
            DISTINCT AttachmentLinkToSubmission.submissionID,    -- Submission ID
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
        DISTINCT Assignments.assignmentID,       -- Assignment ID
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
WHERE Classes.userID = 1000
GROUP BY Classes.classID;                                                  -- Group by class ID and ClassGrade.grade



SELECT * FROM Classes;

SELECT * FROM Attachments;

SELECT * FROM Assignments;

SELECT * FROM Assignments WHERE classID = 1002;

SELECT * FROM Submissions;

SELECT * FROM Grades;

SELECT * FROM GradesLinkToAssignments;

SELECT * FROM Users;

SELECT * FROM UsersToClasses;

SELECT LAST_INSERT_ID();

WITH DuplicateGrades AS (
    SELECT 
        gla.assignmentID,
        gla.gradeID,
        ROW_NUMBER() OVER (PARTITION BY gla.assignmentID ORDER BY gla.gradeID ASC) AS rn
    FROM GradesLinkToAssignments gla
)
DELETE FROM GradesLinkToAssignments
WHERE gradeID IN (
    SELECT gradeID 
    FROM DuplicateGrades 
    WHERE rn > 1  -- Keep only the lowest ID (rn = 1)
);


SELECT 
    Grades.grade,
    Grades.weight
FROM Grades
LEFT JOIN GradesLinkToAssignments ON 
    Grades.gradeID = GradesLinkToAssignments.gradeID
LEFT JOIN GradesAssignmentsLinkToClasses ON
    GradesAssignmentsLinkToClasses.assignmentID = GradesLinkToAssignments.assignmentID
LEFT JOIN Users ON Grades.userID = Users.userID
WHERE 
    Grades.UserID = 1000 AND 
    GradesLinkToAssignments.assignmentID = 56
GROUP BY Grades.gradeID;

SELECT
    Grades.grade,
    Grades.weight
FROM Grades
LEFT JOIN GradesLinkToAssignments ON Grades.gradeID = GradesLinkToAssignments.gradeID
LEFT JOIN Assignments ON GradesLinkToAssignments.assignmentID = Assignments.assignmentID
WHERE Assignments.assignmentID = 2


SELECT 
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
LEFT JOIN GradesLinkToAssignments ON Assignments.assignmentID = GradesLinkToAssignments.assignmentID
LEFT JOIN Grades ON GradesLinkToAssignments.gradeID = Grades.gradeID
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
WHERE Users.userID = 1001
GROUP BY Classes.classID;

SELECT
    Classes.name AS className,
    Classes.courseCode,
    Classes.link AS classLink,
    Classes.termShort,
    Classes.closed,
    JSON_ARRAYAGG(
        DISTINCT JSON_OBJECT(
            'name', Assignments.name,
            'link', Assignments.link,
            'dueDate', Assignments.dueDate,
            'instructions', Assignments.instructions,
            'attachments', (
                SELECT JSON_ARRAYAGG(
                    DISTINCT JSON_OBJECT(
                        'link', Attachments.link,
                        'size', Attachments.size,
                        'name', Attachments.name
                    )
                )
                FROM Attachments
                JOIN AttachmentLinkToAssignment ON Attachments.attachmentID = AttachmentLinkToAssignment.attachmentID
                WHERE AttachmentLinkToAssignment.assignmentID = Assignments.assignmentID
            ),
            'submissions', (
                SELECT JSON_ARRAYAGG(
                    DISTINCT JSON_OBJECT(
                        'd2lSubmissionID', Submissions.d2lSubmissionID,
                        'comment', Submissions.comment,
                        'date', Submissions.date,
                        'attachments', (
                            SELECT JSON_ARRAYAGG(
                                JSON_OBJECT(
                                    'link', Attachments.link,
                                    'size', Attachments.size,
                                    'name', Attachments.name
                                )
                            )
                            FROM Attachments
                            JOIN AttachmentLinkToSubmission ON Attachments.attachmentID = AttachmentLinkToSubmission.attachmentID
                            WHERE AttachmentLinkToSubmission.submissionID = Submissions.submissionID
                        )
                    )
                )
                FROM Submissions
                WHERE Submissions.assignmentID = Assignments.assignmentID
            ),
            'feedback', (
                SELECT JSON_ARRAYAGG(
                    DISTINCT JSON_OBJECT(
                        'html', Feedback.html,
                        'date', Feedback.date
                    )
                )
                FROM Feedback
                JOIN Submissions ON Feedback.submissionID = Submissions.submissionID
                WHERE Submissions.assignmentID = Assignments.assignmentID
            ),
            'submissionURL', Assignments.submissionURL,
            'grade', Grades.grade,
            'weight', Grades.weight
        )
    ) AS assignments
FROM Classes
JOIN Assignments ON Classes.classID = Assignments.classID 
LEFT JOIN GradesLinkToAssignments ON Assignments.assignmentID = GradesLinkToAssignments.assignmentID
LEFT JOIN Grades ON GradesLinkToAssignments.gradeID = Grades.gradeID
WHERE Classes.userID = 1000
GROUP BY Classes.classID;














USE classes;
SELECT
    Classes.name as className,
    Classes.courseCode,
    Classes.link AS classLink,
    Classes.termShort,
    Classes.closed,
    (
        SELECT
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'name', distinctAssignments.name,
                    'link', distinctAssignments.link,
                    'dueDate', distinctAssignments.dueDate,
                    'instructions', distinctAssignments.instructions,
                    'attachments', (
                        SELECT JSON_ARRAYAGG(
                            JSON_OBJECT(
                                'link', Attachments.link,
                                'size', Attachments.size,
                                'name', Attachments.name
                            )
                        ) FROM Attachments
                        JOIN AttachmentLinkToAssignment ON Attachments.attachmentID = AttachmentLinkToAssignment.attachmentID
                        WHERE AttachmentLinkToAssignment.assignmentID = distinctAssignments.assignmentID
                    ),
                    'submissions', (
                        SELECT JSON_ARRAYAGG(
                            JSON_OBJECT(
                                'd2lSubmissionID', Submissions.d2lSubmissionID,
                                'comment', Submissions.comment,
                                'date', Submissions.date,
                                'attachments', (
                                    SELECT JSON_ARRAYAGG(
                                        JSON_OBJECT(
                                            'link', Attachments.link,
                                            'size', Attachments.size,
                                            'name', Attachments.name
                                        )
                                    )
                                    FROM Attachments
                                    JOIN AttachmentLinkToSubmission ON Attachments.attachmentID = AttachmentLinkToSubmission.attachmentID
                                    WHERE AttachmentLinkToSubmission.submissionID = Submissions.submissionID
                                )
                            )
                        )
                        FROM Submissions
                        WHERE Submissions.assignmentID = distinctAssignments.assignmentID
                    ),
                    'feedback', (
                        SELECT JSON_ARRAYAGG(
                            JSON_OBJECT(
                                'html', Feedback.html,
                                'date', Feedback.date
                            )
                        )
                        FROM Feedback
                        JOIN Submissions ON Feedback.submissionID = Submissions.submissionID
                        WHERE Submissions.assignmentID = distinctAssignments.assignmentID
                    ),
                    'submissionURL', distinctAssignments.submissionURL,
                    'grade', Grades.grade,
                    'weight', Grades.weight
                )
            )
        FROM (
            SELECT DISTINCT Assignments.*
            FROM Assignments
        ) as distinctAssignments
        LEFT JOIN GradesLinkToAssignments ON distinctAssignments.assignmentID = GradesLinkToAssignments.assignmentID
        LEFT JOIN Grades ON GradesLinkToAssignments.gradeID = Grades.gradeID
        WHERE distinctAssignments.classID = Classes.classID
    ) AS assignments
FROM Classes
WHERE Classes.userID = 1000
GROUP BY Classes.classID;


SELECT
        Grades.grade,
        Grades.weight
    FROM Grades
    LEFT JOIN GradesLinkToAssignments ON Grades.gradeID = GradesLinkToAssignments.gradeID
    LEFT JOIN Assignments ON GradesLinkToAssignments.assignmentID = Assignments.assignmentID
    WHERE Assignments.assignmentID = 19