from playwright.sync_api import Locator, Page
from assignment import Assignment
from bs4 import BeautifulSoup
from rich import print
import re as Regex

class Course:
    def __init__(self, baseURL: str):
        self.baseURL: str = baseURL
        self.link: str = ""
        self.closed: bool = False
        self.shortTerm: str = ""
        self.name: str = ""
        self.longTerm: str = ""
        self.syllabus: str | None = ""
        self.assignmentsURL: str = ""
        self.assignments: list[Assignment] | None = []
    
    def fill(self, course: Locator, page: Page) -> None:
        """
        ## Description:
            This function fills the course object with the information of the course.
        
        ### Args:
            - page (Page): 
                The page object of the course.
        
        ### Returns:
            None
        
        ### Raises:
            - Exception: 
                If the course does not have a span element.
        """
        # Save start page
        startPage = page.url

        # Get the course details
        soup = BeautifulSoup(course.inner_html(), "html.parser")
        courseDetails = soup.select("span")

        # Check if the course has a span element (Should always be the case)
        if courseDetails:
            # Get the first span element (Should only be one)
            courseDetails = str(courseDetails[0])

            # Get the link of the course
            try:
                self.link = self.baseURL + course.get_attribute("href")
            except:
                raise Exception("Could not get the link of the course.")

            # Check if the course is closed
            self.closed = "Closed, " in courseDetails

            # Get the short term of the course
            shortTerm = Regex.search(r"\((.+)\) .+? - ", courseDetails)
            if shortTerm:
                self.shortTerm = shortTerm.group(1)
            else:
                print("Short term not found.")

            # Get the course code
            courseCode = Regex.search(r"\) (.+) - ", courseDetails)
            if courseCode:
                self.courseCode = courseCode.group(1)
            else:
                print("Course code not found. skipping...")
                raise ValueError("Course code not found.")

            # Get the name of the course
            name = Regex.search(r"- (.+), \d+", courseDetails)
            if name:
                self.name = name.group(1)
            else:
                print("Name not found.")

            # Get the long term of the course
            longTerm = Regex.search(r", \d+, (.+)<", courseDetails)
            if longTerm:
                self.longTerm = longTerm.group(1)
            else:
                print("Long term not found.")

            print(f"Course: {self.courseCode} - {self.name}")
            print("Obtaining syllabus...")

            # Go to the course page
            page.goto(self.link)
            page.wait_for_load_state("load")

            # Go to the Content page
            page.get_by_role("link", name="Content").click()
            page.wait_for_load_state("load")

            # Go to the table of contents
            page.get_by_role("link", name="Table of Contents Table of").click()
            page.wait_for_load_state("load")

            # Get the syllabus of the course
            soup = BeautifulSoup(page.inner_html("*"), "html.parser")
            syllabus = soup.select("a.d2l-link[title*='syllabus'], a.d2l-link[title*='Syllabus']")
            
            # Check if we have a syllabus
            if syllabus:
                # Save the syllabus link
                self.syllabus = self.baseURL + syllabus[0]["href"]
            else:
                self.syllabus = None
            
            print("Obtained syllabus!")
            print("Obtaining assignments...")

            # Go to the Assignments page
            page.get_by_role("link", name="Assignments").first.click()
            page.wait_for_load_state("load")

            # Get the assignments url
            self.assignmentsURL = page.url

            # Check if there are any assignments
            soup = BeautifulSoup(page.inner_html("*"), 'html.parser')
            assignments = soup.select("table.d2l-table.d2l-grid.d_gd > tbody > tr:not(:first-child)")

            # Check that we have assignments
            if assignments:
                # Go through each assignment
                for assignment in page.locator("table.d2l-table.d2l-grid.d_gd > tbody > tr:not(:first-child)").all():
                    # Disregard all breaks or items that are not assignments
                    if assignment.get_attribute("class") != None and \
                       assignment.get_attribute("class").find("d2l-table-row-last") == -1 \
                    :
                        continue
                    
                    # Create a new assignment object
                    newAssignment: Assignment = Assignment(baseUrl=self.baseURL)
                    newAssignment.fill(assignment, page)

                    # Add the assignment to the list of assignments
                    self.assignments.append(newAssignment)

            # If there are no assignments     
            else:
                # Set the assignments to None
                self.assignments = None
            
            print("Obtained assignments!")
            
        else:
            # Throw an error if the course does not have a span element
            raise Exception(
                f"There are no spans that are a child of '''{soup.prettify()}''' in the courses page."
            )

        # Go to the start page
        page.goto(startPage)
    
    def toDict(self):
        return self.__dict__()

    def __dict__(self):
        # Make all the assignments into a dictionary
        assignments = []
        if self.assignments:
            for assignment in self.assignments:
                assignments.append(assignment.toDict())
        else:
            assignments = None

        return {
            "LINK": self.link,
            "NAME": self.name,
            "CLOSED": self.closed,
            "TERMS": {
                "SHORT": self.shortTerm,
                "LONG": self.longTerm,
            },
            "SYLLABUS-URL": self.syllabus,
            "ASSIGNMENTS-URL": self.assignmentsURL,
            "ASSIGNMENTS": assignments,
        }


