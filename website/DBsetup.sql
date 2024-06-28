-- Make database
--CREATE DATABASE classes;
USE classes;

DROP TABLE IF EXISTS 
`Grades`,
`AttachmentLinkToSubmission`, 
`AttachmentLinkToAssignment`,
`Assignments`, 
`Attachments`, 
`Classes`, 
`Feedback`, 
`Submissions`, 
`Users`, 
`UsersToClasses`;

-- Make tables
CREATE TABLE Users (
    userID INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(200) NOT NULL,
    d2lEmail VARCHAR(200) NOT NULL,
    d2lPassword VARCHAR(255) NOT NULL,
    APIKey CHAR(36) DEFAULT (UUID()) NOT NULL
) AUTO_INCREMENT = 1000;

CREATE TABLE Classes (
    classID INT AUTO_INCREMENT PRIMARY KEY,
    closed BOOLEAN NOT NULL DEFAULT FALSE,
    link VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    courseCode VARCHAR(100) NOT NULL,
    termShort VARCHAR(20) NOT NULL,
    termLong VARCHAR(100) NOT NULL
) AUTO_INCREMENT = 1000;


CREATE TABLE UsersToClasses (
    linkID INT AUTO_INCREMENT PRIMARY KEY,
    userID INT NOT NULL,
    classID INT NOT NULL,
    FOREIGN KEY (userID) REFERENCES Users(userID),
    FOREIGN KEY (classID) REFERENCES Classes(classID)
);

CREATE TABLE Assignments (
    assignmentID INT AUTO_INCREMENT PRIMARY KEY,
    classID INT NOT NULL,
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
    date DATETIME NOT NULL,
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
    assignmentID INT NOT NULL,
    grade VARCHAR(30) NOT NULL,
    FOREIGN KEY (userID) REFERENCES Users(userID),
    FOREIGN KEY (assignmentID) REFERENCES Assignments(assignmentID)
) AUTO_INCREMENT = 1;

-- Insert some test data

SELECT * FROM Users;

SELECT * FROM Classes;

SELECT * FROM Attachments;

SELECT * FROM Assignments;

SELECT * FROM Grades

SELECT * FROM Submissions;

SELECT 
    Classes.name, 
    Classes.courseCode, 
    Classes.termShort, 
    Classes.termLong, 
    Classes.link
FROM Classes
INNER JOIN UsersToClasses ON Classes.classID = UsersToClasses.classID
INNER JOIN Users ON UsersToClasses.userID = Users.userID
WHERE Users.userID = 1000;

SELECT 
    Assignments.name,
    Assignments.link,
    Assignments.dueDate,
    Assignments.instructions,
    Assignments.submissionURL,
    Classes.name, 
    Classes.courseCode,
    Classes.link
FROM Assignments
INNER JOIN Classes ON Classes.classID = Assignments.classID
INNER JOIN UsersToClasses ON Classes.classID = UsersToClasses.classID
INNER JOIN Users ON UsersToClasses.userID = Users.userID
WHERE Users.userID = 1000;

SELECT 
    Assignments.name,
    Assignments.link,
    Assignments.dueDate,
    Assignments.instructions,
    Assignments.submissionURL,
    Classes.name AS className, 
    Classes.courseCode,
    Classes.link AS classLink,
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'submissionID', Submissions.submissionID,
            'comment', Submissions.comment,
            'date', Submissions.date,
            'html', Feedback.html,
            'attachments', Attachments.attachmentsJSON
        )
    ) AS submissions
FROM Assignments
JOIN Classes ON Assignments.classID = Classes.classID
LEFT JOIN Submissions ON Assignments.assignmentID = Submissions.assignmentID
LEFT JOIN AttachmentLinkToSubmission ON Submissions.submissionID = AttachmentLinkToSubmission.submissionID
LEFT JOIN (
    SELECT 
        Submissions.submissionID,
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'attachmentID', Attachments.attachmentID,
                'link', Attachments.link,
                'size', Attachments.size,
                'name', Attachments.name
            )
        ) AS attachmentsJSON
    FROM Attachments
    JOIN AttachmentLinkToSubmission ON Attachments.attachmentID = AttachmentLinkToSubmission.attachmentID
    JOIN Submissions ON AttachmentLinkToSubmission.submissionID = Submissions.submissionID
    GROUP BY Submissions.submissionID
) AS Attachments ON Submissions.submissionID = AttachmentLinkToSubmission.submissionID
LEFT JOIN AttachmentLinkToAssignment ON Assignments.assignmentID = AttachmentLinkToAssignment.assignmentID
LEFT JOIN (
    SELECT 
        Assignments.assignmentID,
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'attachmentID', Attachments.attachmentID,
                'link', Attachments.link,
                'size', Attachments.size,
                'name', Attachments.name
            )
        ) AS attachmentsJSON
    FROM Attachments
    JOIN AttachmentLinkToAssignment ON Attachments.attachmentID = AttachmentLinkToAssignment.attachmentID
    JOIN Assignments ON AttachmentLinkToAssignment.assignmentID = Assignments.assignmentID
    GROUP BY Assignments.assignmentID
) AS AssignmentAttachments ON Assignments.assignmentID = AttachmentLinkToAssignment.assignmentID
LEFT JOIN Feedback ON Submissions.submissionID = Feedback.submissionID
JOIN UsersToClasses ON Classes.classID = UsersToClasses.classID
JOIN Users ON UsersToClasses.userID = Users.userID
WHERE Users.userID = 1000
GROUP BY Assignments.assignmentID;




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
WHERE Users.userID = 1000
GROUP BY Classes.classID;



SELECT `Assignments`.instructions, `Assignments`.name, `Assignments`.link, `Assignments`.dueDate, `Assignments`.submissionURL, `Classes`.name, `Classes`.courseCode, `Classes`.link AS classLink, `Submissions`.submissionID, `Submissions`.comment, `Submissions`.date, `Feedback`.html, `Attachments`.link, `Attachments`.size, `Attachments`.name
FROM `Assignments`
JOIN `Classes` ON `Assignments`.classID = `Classes`.classID
LEFT JOIN `Submissions` ON `Assignments`.assignmentID = `Submissions`.assignmentID
LEFT JOIN `AttachmentLinkToSubmission` ON `Submissions`.submissionID = `AttachmentLinkToSubmission`.submissionID
LEFT JOIN `Attachments` ON `AttachmentLinkToSubmission`.attachmentID = `Attachments`.attachmentID
LEFT JOIN `Feedback` ON `Submissions`.submissionID = `Feedback`.submissionID
JOIN `UsersToClasses` ON `Classes`.classID = `UsersToClasses`.classID
JOIN `Users` ON `UsersToClasses`.userID = `Users`.userID
WHERE `Users`.userID = 1000;

SELECT Assignments.assignmentID, Assignments.name, COUNT(Submissions.submissionID) AS submissionCount
FROM Assignments
LEFT JOIN Submissions ON Assignments.assignmentID = Submissions.assignmentID
GROUP BY Assignments.assignmentID, Assignments.name;