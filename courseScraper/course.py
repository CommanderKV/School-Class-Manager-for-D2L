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
from playwright.sync_api import sync_playwright, Page
from customPrint import print # pylint: disable=redefined-builtin,import-error

from assignment import Assignment # pylint: disable=import-error
from grade import Grade # pylint: disable=import-error

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
            link: str | None=None,
            closed: bool=False,
            shortTerm: str | None=None,
            courseCode: str | None=None,
            name: str | None=None,
            longTerm: str | None=None,
            syllabus: str | None=None,
            assignmentsURL: str | None=None,
            assignments: list[Assignment] | None=None,
            grades: list[Grade] | None=None
        ):
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
        self.link: str | None = None if not link else link
        self.closed: bool = False if not closed else closed
        self.shortTerm: str | None = None if not shortTerm else shortTerm
        self.courseCode: str | None = None if not courseCode else courseCode
        self.name: str | None = None if not name else name
        self.longTerm: str | None = None if not longTerm else longTerm
        self.syllabus: str | None = None if not syllabus else syllabus
        self.assignmentsURL: str | None = None if not assignmentsURL else assignmentsURL
        self.assignments: list[Assignment] | None = [] if not assignments else assignments
        self.grades: list[Grade] | None = [] if not grades else grades

    def fill(self, course: tuple[str, str], page: Page) -> None:
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
            self._getShortTerm(courseDetails)

            # Get the course code
            if not self._getCourseCode(courseDetails):
                raise ValueError("Course code not found.")

            # Get the name of the course
            self._getCourseName(courseDetails)

            # Get the long term of the course
            self._getLongTerm(courseDetails)

            print(f"\t[Completed] Course: {self.courseCode} - {self.name}")


            # -------------------------
            #   Get content of course
            # -------------------------

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
            self._getSyllabus(page)

            # Get grades if any
            self._getGrades(page)

            # Get assignments if any
            self._getAssignments(page)

        else:
            # Throw an error if the course does not have a span element
            raise ValueError(f"No text in d2l-card '''{course}'''")

        print("[Completed] Course details obtained!")

        # Go to the start page
        page.goto(startPage)

    def _getShortTerm(self, courseDetails: str) -> bool:
        # Regex search for the short term
        shortTerm = Regex.search(r"\((.+)\) .+? - ", courseDetails)

        # If we found it then save it
        if shortTerm:
            self.shortTerm = shortTerm.group(1)
            print("\t[Success] Short term found!")
            return True

        # If we did not find it then print a warning
        else:
            print("\t[Warning] Short term not found.")
            return False

    def _getCourseCode(self, courseDetails: str) -> bool:
        # Regex search for the course code
        courseCodeReg = Regex.search(r"\) (.+) - ", courseDetails)

        # If we found it then save it
        if courseCodeReg:
            self.courseCode = courseCodeReg.group(1)
            print("\t[Success] Course code found!")
            return True

        # If we did not find it then print an error
        else:
            print("\t[Error] Course code not found. skipping...")
            return False

    def _getCourseName(self, courseDetails: str) -> bool:
        # Regex search for the course name
        name = Regex.search(r"- (.+), \d+", courseDetails)

        # If we found it then save it
        if name:
            self.name = name.group(1)
            print("\t[Success] Name found!")
            return True

        # If we did not find it then print a warning
        else:
            print("\t[Warning] Name not found.")
            return False

    def _getLongTerm(self, courseDetails: str) -> bool:
        # Regex search for the long term
        longTerm = Regex.search(r", \d+, (.+ \d\d\d\d)", courseDetails)

        # If we found it then save it
        if longTerm:
            self.longTerm = longTerm.group(1)
            print("\t[Success] Long term found!")
            return True

        # If we did not find it then print a warning
        else:
            print(f"\t[Warning] Long term not found. {courseDetails}")
            return False

    def _getGrades(self, page: Page) -> bool:
        """
        Used to get the grades of the course.

        Args:
            page (Page): The link to the page.

        Returns:
            bool: Did we get any grades?
        """
        # Navigate to the grades page
        startURL = page.url
        page.get_by_role("link", name="Grades").click()
        page.wait_for_load_state("load")

        # Get the page as a soup object
        soup = BeautifulSoup(page.inner_html("*"), "html.parser")


        # Get the grades Table
        grades = soup.select("table[type='list']")
        if not grades:
            # Go back to start URL
            print("\t[Warning] No grades found.")
            page.go_back()
            page.wait_for_url(startURL)
            page.wait_for_load_state("load")
            return False

        # Check if there are items in the table
        rowHeaders = grades[0].select("tr:not(:first-child):not(.d_ggl1)")
        if not rowHeaders:
            # Go back to start URL
            print("\t[Warning] No items in Grades table.")
            page.go_back()
            page.wait_for_url(startURL)
            page.wait_for_load_state("load")
            return False

        # Get the header row
        rowHeader = {}
        for pos, header in enumerate(grades[0].select("tr:first-child th")):
            rowHeader[header.text.lower()] = pos

        # Get the grades
        for pos, row in enumerate(grades[0].select("tr:not(:first-child):not(.d_ggl1)")):
            # Create a new grade object
            newGrade = Grade()

            # Fill the grade object with the row data
            newGrade.fill(row, rowHeader.copy())

            # Append the grade object to the list of grades
            self.grades.append(newGrade)

        # Go back to start URL
        page.go_back()
        page.wait_for_url(startURL)
        page.wait_for_load_state("load")

        # Print out logs
        print("\t[Success] Obtained grades!")
        return True

    def _getAssignments(self, page: Page) -> bool:
        # Go to the Assignments page
        page.get_by_role("link", name="Assignments").first.click()
        page.wait_for_load_state("load")

        # Set the assignments page url
        self.assignmentsURL = page.url

        # Get the assignments
        soup = BeautifulSoup(page.inner_html("*"), 'html.parser')
        assignmentsSoup = soup.select(
            "table.d2l-table.d2l-grid.d_gd > tbody > tr:not(:first-child)"
        )

        # Check that we have assignments
        if assignmentsSoup:
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

                # Check if the assignment grade is in the grades we have already
                for grade in self.grades:
                    if grade == newAssignment.grade:
                        newAssignment.grade = grade

                # Add the assignment to the list of assignments
                self.assignments.append(newAssignment)

            del assignmentsSoup
            del newAssignment

            # Print out logs
            print("\t[Success] Obtained assignments!")
            return True

        # If there are no assignments
        else:
            # Set the assignments to None
            self.assignments = None
            print("\t[Warning] No assignments found.")
            return False

    def _getSyllabus(self, page: Page) -> bool:
        soup = BeautifulSoup(page.inner_html("*"), "html.parser")
        syllabus = soup.select("a.d2l-link[title*='syllabus'], a.d2l-link[title*='Syllabus']")

        # Check if we have a syllabus
        if syllabus:
            # Save the syllabus link
            self.syllabus = self.baseURL + syllabus[0]["href"]
            print("\t[Success] Syllabus found!")
            return True

        else:
            self.syllabus = None
            print("\t[Warning] Syllabus not found.")
            return False



    def toDict(self) -> dict:
        """
        # Description:
            This function returns the dictionary of the course.

        ## Args:
            None
    
        ## Returns:
            dict[str, str | dict[str, str | int | float | dict[str, str | None] | None] | None]: 
                The dictionary of the course.
        """
        # Make all the assignments into a dictionary
        _assignments = []
        if self.assignments:
            for assignment in self.assignments:
                _assignments.append(assignment.toDict())
        else:
            _assignments = None

        # Make all the grades into a dictionary
        _grades = []
        if self.grades:
            for grade in self.grades:
                _grades.append(grade.toDict())
        else:
            _grades = None

        # Return the dictionary of the course
        return {
            "link": self.link,
            "name": self.name,
            "code": self.courseCode,
            "closed": self.closed,
            "terms": {
                "short": self.shortTerm,
                "long": self.longTerm,
            },
            "syllabus-url": self.syllabus,
            "assignments-url": self.assignmentsURL,
            "assignments": _assignments,
            "grades": _grades
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

        testPage.wait_for_selector(
            "d2l-my-courses-card-grid:first-child .course-card-grid d2l-enrollment-card"
        )
        coursesDiv = testPage.locator("d2l-my-courses-card-grid:first-child .course-card-grid")
        if not coursesDiv:
            raise ValueError("Courses not found!")

        courses = []
        for course2 in coursesDiv.locator("d2l-card").all():
            # Check if href is there
            try:
                href = course2.get_attribute("href")
                if not href:
                    print("[Warning] No href skipping course...")
                    continue

            except: # pylint: disable=bare-except
                print("[Warning] No href skipping course...")
                continue

            # Check if text is there
            try:
                text = course2.get_attribute("text")
                if not text:
                    print("[Warning] No text skipping course...")
                    continue

            except: # pylint: disable=bare-except
                print("[Warning] No text skipping course...")
                continue

            courses.append((href, text))

        if courses:
            value = random.randint(0, len(courses) - 1)
            print(f"RANDOM VALUE: {value}")
            # Server side ASP.NET = 5
            # doc auto: 7
            # reational databases = 16
            randomCourse = courses[value]
            newCourse = Course(baseURL=base)
            newCourse.fill(randomCourse, testPage)

            with open("test.json", "w", encoding="utf-8") as file:
                print(newCourse.toDict())
                json.dump(
                    newCourse.toDict(),
                    file,
                    ensure_ascii=False,
                    indent=4
                )

        else:
            print("No courses found.")
            print(testPage.locator("a").all())
