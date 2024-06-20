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
from bs4 import BeautifulSoup
from playwright.sync_api import Locator, Page
from rich import print # pylint: disable=redefined-builtin

from submission import Submissions


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
        self.due: str = ""
        self.attachments: list[dict[str, str]] | None = []
        self.instructions: str | None = None
        self.submissions: Submissions | None = None
        self.grade: str | None = None
        self.feedback: dict[str, str|None] | None = None


    def fill(self, assignment: Locator, page: Page) -> None:
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
        self._getName(assignment)

        # Output logs
        print(f"Assignment: ***{self.name}*** loading...")

        # Get the assignment link
        self._getLink(assignment)

        # Get the due date
        self._getDueDate(assignment)

        # Get attachments
        self._getAttachments(assignment)

        # Get the instructions
        self._getInstructions(page)

        # Get the submission status
        self._getSubmissions(assignment, page)

        # Get the grade
        self._getGrade(assignment)

        # Get the feedback
        self._getFeedback(assignment, page)

        # Output logs
        print(f"Assignment: ***{self.name}*** loaded!")


    def _getName(self, assignment: Locator) -> str:
        """
        # Description:
            Sets the name of the assignment and returns it

        ## Args:
            - assignment (Locator): 
                The current assignment locator

        ## Returns:
            str: 
                The name of the assignment or "Unavailable"
        """
        try:
            self.name: str = assignment.locator(
                "a.d2l-link[title^='Submit'] strong, .d2l-foldername:nth-child(1) strong"
            ).first.inner_text()
        except Exception as e:
            raise ValueError("Assignment name not found.") from e

        return self.name

    def _getLink(self, assignment: Locator) -> str:
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
                The due date of the assignment or "Unavailable"
        """
        # Get the due date
        soup = BeautifulSoup(assignment.inner_html(), "html.parser")
        dueDate = soup.select(".d2l-dates-text label > strong")

        # Set the due date
        if dueDate:
            self.due: str = dueDate[0].get_text().replace("Due on ", "").strip()
        else:
            self.due: str = "Unavailable"

        return self.due

    def _getAttachments(self, assignment: Locator) -> list[dict[str, str]]:
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
            print(f"\t[NOTICE] Attachments not found. Because of error: {e}")
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
        page.goto(self.link)
        page.wait_for_load_state("load")

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

    def _getGrade(self, assignment: Locator) -> str | None:
        """
        # Description:
            Gets the grade for the assignment

        ## Args:
            - assignment (Locator): 
                The current assignment locator

        ## Returns:
            str | None: 
                The grade for the assignment or None if no grade found
        """
        # Get the grade
        soup = BeautifulSoup(assignment.inner_html(), "html.parser")
        gradeDiv = soup.select(".d2l-grades-score")

        # Check if the grade is available
        if not gradeDiv:
            print("Grade not found.")
            print(soup.prettify())
            return None

        # Get the grade parts
        partsOfGrade = gradeDiv[0].select("label")
        if not partsOfGrade:
            print("Grade parts not found.")
            print(soup.prettify())
            return None

        # Set the grade
        self.grade = ""
        for part in partsOfGrade:
            self.grade += part.get_text()

        # Return the grade
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
        soup = BeautifulSoup(assignment.inner_html(), "html.parser")
        feedbackDiv = soup.select(".d2l-table-cell-last")

        # Check if the feedback div is available (Should always be the case)
        if not feedbackDiv:
            print("\t[NOTICE] Feedback not found.")
            return None

        feedbackLink = feedbackDiv[0].select("a")

        # Check if there is any feedback
        if not feedbackLink:
            print("\t[NOTICE] No feedback available.")
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
            print("Wrong page? query: ***table[role='presentation']*** failed")
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
            print("\t[NOTICE] Feedback was not provided.")
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
            feedbackDate = None
            print(feedbackTables[correctTable].select("tr")[-1].prettify())
            raise ValueError("Feedback date not found. Feedback must have date.")

        # Set the feedback
        self.feedback = {
            "HTML": feedbackHTML,
            "DATE": feedbackDate,
        }

        # Go back to the previous page
        page.goto(pageURL)

        # Return the feedback
        return self.feedback


    def toDict(self):
        """
        # Description:
            Returns the dictionary of the assignment
            
        ## Returns:
            - dict:
                The dictionary of the assignment
        """
        return self.__dict__

    def __dict__(self):
        return {
            "NAME": self.name,
            "LINK": self.link,
            "DUE": self.due,
            "INSTRUCTIONS": self.instructions,
            "ATTACHMENTS": self.attachments,
            "SUBMISSIONS": self.submissions.toDict() if self.submissions else None,
            "GRADE": self.grade,
            "FEEDBACK": self.feedback
        }


















