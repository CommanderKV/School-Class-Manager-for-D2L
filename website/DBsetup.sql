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
) AUTO_INCREMENT = 1000


CREATE TABLE UsersToClasses (
    linkID INT AUTO_INCREMENT PRIMARY KEY,
    userID INT NOT NULL,
    classID INT NOT NULL,
    FOREIGN KEY (userID) REFERENCES Users(userID),
    FOREIGN KEY (classID) REFERENCES Classes(classID)
)

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

