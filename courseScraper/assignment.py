"""
# Description:
    This module contains the Assignment class which is used to store the 
    information of an assignment.
    
## Classes:
    - Assignment: 
        This class is used to store the information of an assignment.
        
## Functions:
    None
"""
from random import randint
from bs4 import BeautifulSoup
from playwright.sync_api import Locator, Page
from playwright._impl._errors import TimeoutError as PlaywrightTimeoutError
from customPrint import print # pylint: disable=redefined-builtin,import-error

from submission import Submissions, convertTime # pylint: disable=import-error
from grade import Grade # pylint: disable=import-error


class Assignment:
    """
    # Description:
        The Assignment object stores information about an assignment
    
    ## Attributes:
        - name (str): The name of the assignment
        - link (str): The link to the assignment
        - instructions (str): The instructions for the assignment
        - due (str): The due date of the assignment
        - attachments (list[dict[str, str]]): The attachments for the assignment
        - submissions (list[Submission]): The submissions for the assignment
    """
    def __init__(self, baseUrl: str):
        """
        # Description:
            Initializes the Assignment object

        ## Args:
            - baseUrl (str): 
                The base URL of the page for example https://example.com 
        """
        self.baseUrl: str = baseUrl
        self.name: str = ""
        self.link: str | None = None
        self.uid: int | None = None
        self.due: str = ""
        self.attachments: list[dict[str, str]] | None = []
        self.instructions: str | None = None
        self.submissions: Submissions | None = None
        self.grade: Grade | None = None
        self.feedback: dict[str, str|None] | None = None


    def fill(self, assignment: Locator, page: Page, courseName: str) -> None: # pylint: disable=too-many-branches
        """
        # Description:
            Fills the assignment object with the information of the assignment

        ## Args:
            - assignment (Locator): 
                The current assignment locator
            - page (Page):
                The current page object

        ## Returns:
            None

        ## Usage:
            assignment.fill(assignmentLocator, page)

        """
        # Get the assignment name
        self._getName(assignment, courseName)

        # Output logs
        print(f"\t\t[Notice] Assignment: \"{self.name}\" loading...")

        # Get the assignment link
        if self._getLink(assignment) is None:
            print("\t\t\t[Error] Assignment link not found!")
        else:
            print("\t\t\t[Success] Obtained assignment link!")

        # Get the due date
        if self._getDueDate(assignment) is None:
            print("\t\t\t[Warning] Due date not found!")
        else:
            print("\t\t\t[Success] Obtained due date!")

        # Get attachments
        if self._getAttachments(assignment) is None:
            print("\t\t\t[Notice] No attachments found!")
        else:
            print("\t\t\t[Success] Obtained attachments!")

        # Get the instructions
        if self._getInstructions(page) is None:
            print("\t\t\t[Notice] No instructions found!")
        else:
            print("\t\t\t[Success] Obtained instructions!")

        # Get the submission status
        if self._getSubmissions(assignment, page) is None:
            print("\t\t\t[Notice] No submissions found!")
        else:
            print("\t\t\t[Success] Obtained submissions!")

        # Get the grade
        if self._getGrade(assignment, courseName) is None:
            print("\t\t\t[Notice] Grade not found!")
        else:
            print("\t\t\t[Success] Obtained grade!")

        # Get the feedback
        if self._getFeedback(assignment, page) is None:
            print("\t\t\t[Notice] Feedback not found!")
        else:
            print("\t\t\t[Success] Obtained feedback!")

        # Output logs
        print(f"\t\t[Success] Assignment: \"{self.name}\" loaded!")


    def _getName(self, assignment: Locator, courseName: str) -> str:
        """
        # Description:
            Sets the name of the assignment and returns it

        ## Args:
            - assignment (Locator): 
                The current assignment locator
            - courseName (str):
                The name of the course

        ## Returns:
            str: 
                The name of the assignment or "Unavailable"
        """
        try:
            self.name: str = assignment.locator(
                "a.d2l-link[title^='Submit'] strong, .d2l-foldername:nth-child(1) strong"
            ).first.inner_text()

            # Set the UID of the assignment
            self.uid = sum((ord(char) for char in self.name.replace(" ", "_")))
            self.uid += sum((ord(char) for char in courseName.replace(" ", "_")))

        except Exception as e:
            raise ValueError("Assignment name not found.") from e

        return self.name

    def _getLink(self, assignment: Locator) -> str | None:
        """
        # Description:
            Sets the link of the assignment and returns it

        ## Args:
            - assignment (Locator): 
                The current assignment locator

        ## Returns:
            str: 
                The link of the assignment or "Unavailable"
        """
        # Get the assignments html
        soup = BeautifulSoup(assignment.inner_html(), "html.parser")

        # Get the link
        a = soup.select(".d2l-foldername:nth-child(1) a")

        # Set the link
        if a:
            self.link = self.baseUrl + a[0]["href"]
        else:
            self.link = None

        return self.link

    def _getDueDate(self, assignment: Locator) -> str:
        """
        # Description:
            Sets the due date of the assignment and returns it

        ## Args:
            - assignment (Locator): 
                The current assignment locator

        ## Returns:
            str: 
                The due date of the assignment or "1999-01-01 00:00:00"
        """
        # Get the due date
        soup = BeautifulSoup(assignment.inner_html(), "html.parser")
        dueDateRaw = soup.select(".d2l-dates-text label > strong")

        # Set the due date
        if not dueDateRaw:
            self.due: str = "1999-01-01 00:00:00"
            return self.due

        # Process the data into a datetime format
        dueDateProcessed: str = dueDateRaw[0].get_text().replace("Due on ", "").strip()

        # Set the due date
        self.due = convertTime(dueDateProcessed)

        return self.due

    def _getAttachments(self, assignment: Locator) -> list[dict[str, str]] | None:
        """
        # Description:
            Sets the attachments of the assignment and returns them

        ## Args:
            - assignment (Locator): 
                The current assignment locator

        ## Returns:
            list[dict[str, str]]: 
                The attachments of the assignment or []
        """
        try:
            attachments = []
            # Go through each attachment
            for pos, attachment in enumerate(assignment.locator("a[title^='Open']").all()):
                # Get the name
                name = attachment.get_attribute("title").replace("Open ", "")

                # Get the link
                link = self.baseUrl + attachment.get_attribute("href")

                # Get the size
                size = assignment.locator(f"table tr:nth-child({pos+1}) span > span").inner_text() \
                                 .replace("(", "").replace(")", "").strip()

                attachments.append({
                    "LINK": link,
                    "NAME": name,
                    "SIZE": size,
                })

            # If no attachments found set to None
            if len(attachments) == 0:
                attachments = None

        except Exception as e: # pylint: disable=broad-except
            print(f"\t[Error] Attachments not found. Because of error: {e}")
            attachments = None

        # Save the attachments
        self.attachments: list[dict[str, str]] = attachments

        # Return the attachments
        return attachments

    def _getInstructions(self, page: Page) -> str | None:
        """
        # Description:
            Sets the instructions of the assignment and returns them

        ## Args:
            - page (Page):
                The current page object

        ## Returns:
            str | None: 
                The instructions of the assignment or None
        """

        # Check if we have the link
        if not self.link:
            return None

        # Save the page url
        pageURL = page.url

        # Go to the assignment page
        try:
            page.goto(self.link, timeout=60000)
            page.wait_for_load_state("load")

        except PlaywrightTimeoutError as e:
            print(f"\t\t\t[Error] Timed out while fetching instructions. Error: {e}")
            self.instructions = None
            return self.instructions



        # Get the instructions
        soup = BeautifulSoup(page.inner_html("*"), "html.parser")
        instructions = soup.select("table[role='presentation']:nth-child(1) d2l-html-block")

        # Set the instructions
        if instructions:
            self.instructions: str = str(instructions[0]["html"])
        else:
            self.instructions = None

        # Go back to the previous page
        page.goto(pageURL)
        page.wait_for_load_state("load")

        # Return the instructions
        return self.instructions

    def _getSubmissions(self, assignment: Locator, page: Page) -> Submissions | None:
        """
        # Description:
            Gets all submissions if there are any

        ## Args:
            - assignment (Locator): 
                The current assignment locator
            - page (Page):
                The current page object

        ## Returns:
            Submissions | None: 
                The submissions of the assignment or None if no submissions found
        """
        # Check to see if there are any submissions
        soup = BeautifulSoup(assignment.inner_html(), "html.parser")
        submission = soup.select("a[title^='Submission']")

        # Check if there are any submissions with this assignment
        if not submission:
            return None

        # Get the submission link
        submission = submission[0]
        submissionLink = self.baseUrl + submission["href"]

        # Get the submissions
        self.submissions: Submissions = Submissions(submissionLink)
        self.submissions.fill(page)

        # Return the submissions
        return self.submissions

    def _getGrade(self, assignment: Locator, courseName: str) -> str | None:
        """
        # Description:
            Gets the weight for the assignment

        ## Args:
            - assignment (Locator): 
                The current assignment locator
            - courseName (str):
                The name of the course

        ## Returns:
            str | None: 
                The weight for the assignment or None if no weight found
        """
        # Save the url
        startURL = assignment.page.url

        # Go to the grades page
        assignment.page.get_by_role("link", name="Grades").click()
        assignment.page.wait_for_load_state("load")

        # Get the weight of the assignment
        soup = BeautifulSoup(assignment.page.inner_html("*"), "html.parser")

        # Get the grades table
        grades = soup.select("table[type='list']")
        if not grades:
            # Go back to start URL
            assignment.page.goto(startURL)
            assignment.page.wait_for_url(startURL)
            assignment.page.wait_for_load_state("load")
            return None

        # Get the weight column from the table
        headers = grades[0].select("tr:first-child th")

        # Make a header dict
        headerDict = {}
        for pos, header in enumerate(headers):
            headerDict[header.text.lower()] = pos

        for pos, row in enumerate(grades[0].select("tr:not(:first-child):not(.d_ggl1)")):
            if row.select("th label")[0].get_text().replace(" ", "") != self.name.replace(" ", ""):
                continue

            # Make the grade object
            self.grade = Grade()

            # Fill the grade object
            self.grade.fill(
                row,
                headerDict.copy(),
                courseName
            )

            break

        # Go back to start URL
        assignment.page.go_back()
        assignment.page.wait_for_url(startURL)
        assignment.page.wait_for_load_state("load")

        # Return the weight
        return self.grade

    def _getFeedback(self, assignment: Locator, page: Page) -> dict[str, str] | None:
        """
        # Description:
            Gets the feedback for the assignment

        ## Args:
            - assignment (Locator): 
                The current assignment locator
            - page (Page):
                The current page object

        ## Returns:
            dict[str, str] | None: 
                The feedback for the assignment and the time it was given
                or None if no feedback found
        """
        # Save the page url
        pageURL = page.url

        # Get the feedback link
        for _ in range(5):
            try:
                soup = BeautifulSoup(assignment.inner_html(), "html.parser")
                break

            except Exception: # pylint: disable=broad-except
                print(assignment.page.url)

        feedbackDiv = soup.select(".d2l-table-cell-last")

        # Check if the feedback div is available (Should always be the case)
        if not feedbackDiv:
            print("\t\t\t[Error] Feedback div not found.")
            return None

        feedbackLink = feedbackDiv[0].select("a")

        # Check if there is any feedback
        if not feedbackLink:
            print("\t\t\t[Warning] No feedback available.")
            self.feedback = None
            return None

        # Get the feedback link
        page.goto(self.baseUrl + feedbackLink[0]["href"])
        page.wait_for_load_state("load")

        # Check if the feedback is available
        soup = BeautifulSoup(page.inner_html("*"), "html.parser")
        feedbackTables = soup.select("table[role='presentation']")

        # Check if the feedback table is available
        if not feedbackTables:
            print(soup.prettify())
            print("\t\t\t[Error] Wrong page? query: ***table[role='presentation']*** failed")
            return None

        feedbackHTML = feedbackTables[0].select(
            "tr:last-child .d2l-htmlblock-untrusted > d2l-html-block"
        )

        # Check if there is feedback
        if feedbackHTML:
            # Set the feedback
            feedbackHTML = str(feedbackHTML[0]["html"])

        else:
            # Log that feedback was not provided
            print("\t\t\t[Notice] Feedback was not provided.")
            feedbackHTML = None

        # Get the table that has the feedback date
        correctTable = 0
        for index, table in enumerate(feedbackTables):
            rows = table.select("tr:not(:last-child):nth-child(3)")
            for row in rows:
                text = row.select("span")
                if text:
                    if text[0].get_text().find("Feedback") != -1:
                        correctTable = index
                        break

        # Look for the feedback date in the case there is no feedback but a feedback date
        feedbackDate = feedbackTables[correctTable].select("tr:last-child label")

        # Set the feedback date
        if feedbackDate:
            feedbackDate: str = feedbackDate[0].get_text()
        else:
            # Error out if no feedback date found
            feedbackDate = "Jan 1, 2024 12:00 AM"
            print("\t\t\t[Notice] Feedback date was not found using default value of \"Jan 1, 2024 12:00 AM\"") # pylint: disable=line-too-long

        # Set the feedback
        self.feedback = {
            "html": feedbackHTML,
            "date": feedbackDate,
        }

        # Go back to the previous page
        page.goto(pageURL)

        # Return the feedback
        return self.feedback


    def toDict(self):
        """
        # Description:
            Converts the assignment object to a dictionary

        ## Args:
            None

        ## Returns:
            dict[str, str | int | float | None | dict[str, str | None]]: 
                The dictionary of the assignment
        """
        return {
            "name": self.name,
            "link": self.link,
            "uid": self.uid if self.uid else randint(0, 1000000),
            "due": self.due,
            "instructions": self.instructions,
            "attachments": self.attachments,
            "submissions": self.submissions.toDict() if self.submissions else None,
            "grade": self.grade.toDict() if self.grade else None,
            "feedback": self.feedback
        }
