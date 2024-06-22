"""
# Description:
    This module contains the Course class which is used to store the information of a course.
    
## Classes:
    - Course: 
        This class is used to store the information of a course.
        
## Functions:
    None
"""
import json
import os
import random
import time
import re as Regex

from dotenv import load_dotenv
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, Locator, Page
from customPrint import print # pylint: disable=redefined-builtin

from assignment import Assignment

class Course:
    """
    # Description:
        This class is used to store the information of a course.

    ## Attributes:
        - baseURL (str): 
            The base URL of the course.
        - link (str): 
            The link of the course.
        - closed (bool): 
            A flag to indicate whether the course is closed.
        - shortTerm (str): 
            The short term of the course.
        - courseCode (str):
            The course code of the course.
        - name (str): 
            The name of the course.
        - longTerm (str): 
            The long term of the course.
        - syllabus (str|None): 
            The URL of the syllabus of the course.
        - assignmentsURL (str): 
            The URL of the assignments of the course.
        - assignments (list[Assignment]|None): 
            The list of assignments of the course.
    """
    def __init__(
            self,
            baseURL: str,
            link: str="",
            closed: bool=False,
            shortTerm: str="",
            courseCode: str="",
            name: str="",
            longTerm: str="",
            syllabus: str|None="",
            assignmentsURL: str="",
            assignments: list[Assignment]|None=[]
        ): # pylint: disable=dangerous-default-value
        """
        # Description:
            The constructor of the Course class.

        ## Args:
            ### Required:
                - baseURL (str): 
                    The base URL of the course.

            ### Optional:
                These arguments can be used to build a course with existing data
                - link (str): 
                    The link of the course.
                - closed (bool): 
                    A flag to indicate whether the course is closed.
                - shortTerm (str): 
                    The short term of the course.
                - courseCode (str):
                    The course code of the course.
                - name (str): 
                    The name of the course.
                - longTerm (str): 
                    The long term of the course.
                - syllabus (str|None): 
                    The URL of the syllabus of the course.
                - assignmentsURL (str): 
                    The URL of the assignments of the course.
                - assignments (list[Assignment]|None): 
                    The list of assignments of the course.
        """
        self.baseURL: str = baseURL
        self.link: str = link
        self.closed: bool = closed
        self.shortTerm: str = shortTerm
        self.courseCode: str = courseCode
        self.name: str = name
        self.longTerm: str = longTerm
        self.syllabus: str | None = syllabus
        self.assignmentsURL: str = assignmentsURL
        self.assignments: list[Assignment] | None = assignments

    def fill(self, course: tuple[str, str], page: Page) -> None: # pylint: disable=too-many-branches
        """
        # Description:
            This function fills the course object with the information of the course.
        
        ## Args:
            - page (Page): 
                The page object of the course.
        
        ## Returns:
            None
        
        ## Raises:
            - Exception: 
                If the course does not have a span element.
        """
        print("[Notice] Obtaining course details...")
        # Save start page
        startPage = page.url

        # Get the course details
        courseDetails = course[1]

        # Check if the course has a span element (Should always be the case)
        if courseDetails:
            # Get the link of the course
            try:
                self.link = self.baseURL + course[0]
            except Exception as exc:
                raise ValueError("Could not get the link of the course.") from exc

            # Check if the course is closed
            self.closed = "Closed, " in courseDetails

            # Get the short term of the course
            shortTerm = Regex.search(r"\((.+)\) .+? - ", courseDetails)
            if shortTerm:
                self.shortTerm = shortTerm.group(1)
                print("\t[Success] Short term found!")
            else:
                print("\t[Warning] Short term not found.")

            # Get the course code
            courseCodeReg = Regex.search(r"\) (.+) - ", courseDetails)
            if courseCodeReg:
                self.courseCode = courseCodeReg.group(1)
                print("\t[Success] Course code found!")
            else:
                print("\t[Error] Course code not found. skipping...")
                raise ValueError("Course code not found.")

            # Get the name of the course
            name = Regex.search(r"- (.+), \d+", courseDetails)
            if name:
                self.name = name.group(1)
                print("\t[Success] Name found!")
            else:
                print("\t[Warning] Name not found.")

            # Get the long term of the course
            longTerm = Regex.search(r", \d+, (.+ \d\d\d\d)", courseDetails)
            if longTerm:
                self.longTerm = longTerm.group(1)
                print(f"\t[Success] Long term found!")
            else:
                print(f"\t[Warning] Long term not found. {courseDetails}")

            print(f"\t[Completed] Course: {self.courseCode} - {self.name}")

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
                print("\t[Success] Syllabus found!")
            else:
                self.syllabus = None
                print("\t[Warning] Syllabus not found.")

            # Go to the Assignments page
            page.get_by_role("link", name="Assignments").first.click()
            page.wait_for_load_state("load")

            # Get the assignments url
            self.assignmentsURL = page.url

            # Check if there are any assignments
            soup = BeautifulSoup(page.inner_html("*"), 'html.parser')
            assignments = soup.select(
                "table.d2l-table.d2l-grid.d_gd > tbody > tr:not(:first-child)"
            )

            # Check that we have assignments
            if assignments:
                # Go through each assignment
                for assignment in page.locator(
                    "table.d2l-table.d2l-grid.d_gd > tbody > tr:not(:first-child)"
                ).all():
                    # Disregard all breaks or items that are not assignments
                    if assignment.get_attribute("class") and \
                       assignment.get_attribute("class").find("d2l-table-row-last") == -1 \
                    :
                        continue

                    # Create a new assignment object
                    newAssignment: Assignment = Assignment(baseUrl=self.baseURL)
                    newAssignment.fill(assignment, page)

                    # Add the assignment to the list of assignments
                    self.assignments.append(newAssignment)
                
                # Print out logs
                print("\t[Success] Obtained assignments!")

            # If there are no assignments
            else:
                # Set the assignments to None
                self.assignments = None
                print("\t[Warning] No assignments found.")

            # Print out logs
            print("\t[Success] Obtained assignments!")

        else:
            # Throw an error if the course does not have a span element
            raise ValueError(f"No text in d2l-card '''{course.inner_html()}'''")

        print("[Completed] Course details obtained!")

        # Go to the start page
        page.goto(startPage)

    @property
    def __dict__(self):
        """
        # Description:
            This function returns the dictionary of the course.
    
        ## Returns:
            - dict: 
                The dictionary of the course.
        """
        # Make all the assignments into a dictionary
        assignments = []
        if self.assignments:
            for assignment in self.assignments:
                assignments.append(assignment.__dict__)
        else:
            assignments = None

        # Return the dictionary of the course
        return {
            "LINK": self.link,
            "NAME": self.name,
            "CODE": self.courseCode,
            "CLOSED": self.closed,
            "TERMS": {
                "SHORT": self.shortTerm,
                "LONG": self.longTerm,
            },
            "SYLLABUS-URL": self.syllabus,
            "ASSIGNMENTS-URL": self.assignmentsURL,
            "ASSIGNMENTS": assignments,
        }


if __name__ == "__main__":
    # Test the Course class
    load_dotenv(dotenv_path=".env")

    with sync_playwright() as play:
        testPage = play.chromium.launch(headless=True).new_page()
        testPage.goto("https://mycourselink.lakeheadu.ca/d2l/home")
        testPage.wait_for_load_state("load")

        # Login
        print("Logging in...")
        testPage.get_by_label("Username*").click()
        testPage.get_by_label("Username*").fill(os.getenv("D2L_USERNAME"))
        testPage.get_by_label("Password*").click()
        testPage.get_by_label("Password*").fill(os.getenv("D2L_PASSWORD"))
        testPage.get_by_role("button", name="Login").click()

        # Navigate to the courses "page" / popup
        try:
            testPage.wait_for_url("https://mycourselink.lakeheadu.ca/d2l/home")
            print("Logged in!")

        except Exception as e:
            if testPage.query_selector("body > div.login-onethird > section > p"):
                raise ValueError("Invaild login credentials!") from e

            raise e

        testPage.wait_for_load_state("load")
        testPage.get_by_role("heading", name="View All Courses").click()

        time.sleep(.25)

        base = testPage.url[:Regex.search(r"(https?://[^/]+)", testPage.url).end()]

        courses = testPage.locator("a[href^='/d2l/home/']").all()
        if courses:
            length = len(courses)
            randomCourse = courses[random.randint(0, length - 1)]

            newCourse = Course(baseURL=base)
            newCourse.fill(randomCourse, testPage)

            with open("test.json", "w", encoding="utf-8") as file:
                print(newCourse.__dict__)
                json.dump(
                    newCourse.__dict__,
                    file,
                    ensure_ascii=False,
                    indent=4
                )

        else:
            print("No courses found.")
            print(testPage.locator("a").all())
