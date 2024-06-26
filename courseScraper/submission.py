"""
# Description:
    This module contains the Submissions class.
    
## Classes:
    - Submissions: 
        This class is used to store the submissions of a course.
        
## Functions:
    None
"""
import re as Regex

from bs4 import BeautifulSoup
from playwright.sync_api import Page
from customPrint import print # pylint: disable=redefined-builtin,import-error

class Submissions:
    """
    # Description:
        This class is used to store the submissions of a course.

    ## Args:
        - submissionsURL (str): 
            The URL of the submissions page of the course.

    ## Attributes:
        - url (str): 
            The URL of the submissions page of the course.
        - id (int): 
            The ID of the course.
        - submissions (list[dict[str, str|int|dict[str, str]]]): 
            The list of submissions of the course.
    """
    def __init__(self, submissionsURL: str):
        """
        # Description:
            The constructor of the Submissions class.

        ## Args:
            - submissionsURL (str): 
                The URL of the submissions page.
        """
        self.url: str = submissionsURL
        self.baseURL: str = Regex.search(r"(https?://[^/]+)", submissionsURL).group(1)
        self.id: int
        self.submissions: list[dict[str, str|int|dict[str, str]]] = []

    def fill(self, page: Page, goBack: bool=True) -> None:
        """
        # Description:
            This function fills the submissions list with the submissions 
            of the course.

        ## Args:
            - page (Page): 
                The page object of the course.
            - goBack (bool):
                A flag to indicate whether we need to go back to the 
                original page after filling the submissions list.

        ## Returns:
            None

        ## Raises:
            - Exception: 
                If there are no cells in the row of the submissions table.
        
        ## Usage:
            This will fill the submissions list with the submissions of the 
            course.
            ```python
            submissions = Submissions("https://example.com/submissions")
            submissions.fill(page=page)
            ```

            This will fill the submissions list with the submissions of the 
            course and go back to the original page.
            ```python
            submissions = Submissions("https://example.com/submissions")
            submissions.fill(page=page, goBack=True)
            ```
        """
        goBackAddress = page.url

        # Go to the submissions page
        page.goto(self.url)
        page.wait_for_load_state("load")

        # Get all submissions
        soup = BeautifulSoup(page.inner_html("*"), 'html.parser')
        rows = soup.select("table[type='list'] tr:not(:first-child)")

        # Check if we have any submissions
        if rows:
            # Create a temporary submission object
            currentSubmission = {}

            # Go through each row in the table of submissions
            for row in rows:
                cells = row.select("td")

                # Check if we have any cells in the row (Should always be the case)
                if cells:
                    # Check if the submission is the start of a new submission
                    if str(cells[0]).find("<label>") != -1:
                        # Check if we have a current submission
                        if currentSubmission:
                            if len(currentSubmission["FILES"]) < 1:
                                print("\t\t\t\t[Notice] No files found in the submission.")
                                print(f"\t\t\t\t[bold]{str(cells[1])}")
                                print(f"\t\t\t\t[bold]Link: {page.url}")
                                currentSubmission["FILES"] = None

                            # Add the current submission to the list of submissions
                            self.submissions.append(currentSubmission)

                        # Get the ID of the submission
                        idRaw = Regex.search(r">(\d+)<", str(cells[0]))
                        if idRaw:
                            currentSubmission["ID"] = int(idRaw.group(1))
                        else:
                            raise ValueError(
                                f"ID not in row of the submissions table. Link: {page.url}"
                            )

                        # Get the files submitted
                        fileDetails = self._getFileDetails(str(cells[1]))
                        currentSubmission["FILES"] = [fileDetails] if fileDetails else []

                        # Set default value for the comment
                        currentSubmission["COMMENT"] = None

                        # Get the date submitted
                        date = Regex.search(r"<label>(.+)</label>", str(cells[2]))
                        if date:
                            # Process the data into a datetime format
                            dueDateProcessed: str = date.group(1).strip()

                            month: str = dueDateProcessed.split(" ")[0]
                            day: str = dueDateProcessed.split(" ")[1].replace(",", "")
                            year: str = dueDateProcessed.split(" ")[2]
                            time: str = dueDateProcessed.split(" ")[3]
                            add24Hours: bool = True if dueDateProcessed.split(" ")[4].lower() == "pm" else False # pylint: disable=line-too-long

                            # Create the time
                            time = time + ":00"
                            if add24Hours and int(time.split(":")[0]) < 12:
                                time = str(int(time.split(":")[0]) + 12) + ":" + time.split(":")[1] + ":00" # pylint: disable=line-too-long

                            # Convert the month to a number
                            months: dict[str, str] = {
                                "jan": "01",
                                "feb": "02",
                                "mar": "03",
                                "apr": "04",
                                "may": "05",
                                "jun": "06",
                                "jul": "07",
                                "aug": "08",
                                "sep": "09",
                                "oct": "10",
                                "nov": "11",
                                "dec": "12",
                            }

                            # Set the due date
                            currentSubmission["DATE"] = f"{year}-{months[month.lower()]}-{day} {time}" # pylint: disable=line-too-long

                    # If the submission is not the start of a new submission
                    else:
                        # Get the files submitted
                        currentSubmission["FILES"].append(
                            self._getFileDetails(str(cells[1]))
                        )

                    # Get the comments if any
                    comment = self._getComment(str(cells[1]))
                    if comment:
                        currentSubmission["COMMENT"] = comment

                else:
                    # Raise an error if there are no cells in the row
                    raise ValueError(
                        f"No cells found in row of the submissions table. Link: {page.url}"
                    )
            self.submissions.append(currentSubmission)

        else:
            print("\t\t\t\t[NOTICE] No submissions")
            print(soup.prettify())

        # Check if we need to go back to the original page
        if goBack:
            # Go back to the original page
            page.goto(goBackAddress)


    def _getFileDetails(self, cell: str) -> dict[str, str] | None:
        """
        # Description:
            This function extracts the details of the file submitted by the student.

        ## Args:
            - cell (str): 
                The HTML cell containing the file details.

        ## Returns:
            dict[str, str|int] | None: 
                The details of the file submitted by the student. 
                NOTE: None if no file is found.
        """
        # Get the name, link, and size of the file
        soup = BeautifulSoup(cell, 'html.parser')
        a = soup.select("a")

        # Check if there are any files submitted
        if not a:
            print("\t[NOTICE] No files found in the submission.")
            return None

        a = a[0]

        # Get the details of the file
        rawName: str = str(a.select("span")[0])
        link: str = self.baseURL + a["href"]
        rawSize: str = str(a.parent.select("span")[1])

        # Check if data is valid
        if rawName and link and rawSize:
            name: str = Regex.search(r"<span>(.+)</span>", rawName).group(1)
            size: str = Regex.search(r"\((.+)\)", rawSize).group(1)

        else:
            print(f"\t[NOTICE] Invalid data:\n\t\tname: {rawName}, link: {link}, size: {rawSize}")
            return None

        # Return the file details
        return {
            "LINK": link,
            "NAME": name,
            "SIZE": size
        }

    def _getComment(self, cell: str) -> str | None:
        """
        # Description:
            This function extracts the comments left on a submission.

        ## Args:
            - cell (str): 
                The HTML cell containing the comments.

        ## Returns:
            str | None: 
                The comment html. NOTE: None if no comment is found.
        """
        # Get the comment
        soup = BeautifulSoup(cell, 'html.parser')
        commentDiv = soup.select(".d2l-htmlblock-assignments-comments")

        # If we have a comment, return it
        if commentDiv:
            comment = commentDiv[0].select("d2l-html-block")
            if comment:
                return str(comment[0]["html"])

            print("\t[NOTICE] No comment found in the submission.")
            return None


        return None

    @property
    def __dict__(self):
        return {
            "URL": self.url,
            "SUBMISSIONS": self.submissions
        }
