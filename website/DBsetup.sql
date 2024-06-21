-- Active: 1714171043711@@visserfamily.ca@3306@classes
-- Make database
CREATE DATABASE classes;
USE classes;

-- Make tables
CREATE TABLE Users (
    userID INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(200) NOT NULL,
    d2lEmail VARCHAR(200) NOT NULL,
    d2lPassword VARCHAR(255) NOT NULL
)

ALTER TABLE Users AUTO_INCREMENT = 1000;

CREATE TABLE Classes (
    classID INT AUTO_INCREMENT PRIMARY KEY,
    closed BOOLEAN NOT NULL DEFAULT FALSE,
    link VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    courseCode VARCHAR(100) NOT NULL,
    termShort VARCHAR(20) NOT NULL,
    termLong VARCHAR(100) NOT NULL
)

ALTER TABLE Classes AUTO_INCREMENT = 1;

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
    link VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    dueDate DATETIME NOT NULL,
    FOREIGN KEY (classID) REFERENCES Classes(classID)
)

ALTER TABLE Assignments AUTO_INCREMENT = 1;

CREATE TABLE Submissions (
    submissionID INT AUTO_INCREMENT PRIMARY KEY,
    assignmentID INT NOT NULL,
    link VARCHAR(255) NOT NULL,
    comment VARCHAR(1000),
    d2lSubmissionID INT NOT NULL,
    FOREIGN KEY (assignmentID) REFERENCES Assignments(assignmentID)
)

ALTER TABLE Submissions AUTO_INCREMENT = 1;

CREATE TABLE Attachments (
    attachmentID INT AUTO_INCREMENT PRIMARY KEY,
    submissionID INT, -- If NULL, it is an assignment attachment
    assignmentID INT, -- If NULL, it is a submission attachment
    link VARCHAR(255) NOT NULL,
    size INT NOT NULL,
    FOREIGN KEY (submissionID) REFERENCES Submissions(submissionID),
    FOREIGN KEY (assignmentID) REFERENCES Assignments(assignmentID)
)

ALTER TABLE Attachments AUTO_INCREMENT = 1;