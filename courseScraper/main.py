"""
# Description:
    This program scrapes the courses from the Lakehead University's D2L page and 
    turns it into a json file.
"""
import json
import os
import sys
import re as Regex

from dotenv import load_dotenv
from playwright.sync_api import Page, Playwright, sync_playwright
from customPrint import print # pylint: disable=redefined-builtin,import-error

from course import Course # pylint: disable=import-error

# Load the environment variables
dotenv_path=os.path.join(
    os.path.dirname(
        os.path.abspath(__file__)
    ),
    ".env"
)
load_dotenv(dotenv_path=dotenv_path)

# Access the environment variables
LINK = "https://mycourselink.lakeheadu.ca/d2l/home"
USERNAME = os.getenv("D2L_USERNAME")
PASSWORD = os.getenv("D2L_PASSWORD")
SAVEFILE = "courses.json"

def saveToFile(courses: list[Course], filename: str) -> None:
    """
    # Description:
        This function saves the data to a file.

    ### Args:
        - data (any): 
            The data to save.
        - filename (str): 
            The name of the file.
    """
    print("[Notice] Saving course details...")
    with open(filename, "w", encoding="utf-8") as file:
        json.dump(
            [course.toDict() for course in courses],
            file,
            indent=4
        )
    print("[Completed] Course details saved!")

def getCourses(page: Page) -> list[Course]:
    """
    # Description:
        This function gets the courses from the page.

    ## Args:
        - page (Page): 
            The page object of the courses.

    ## Returns:
        list[Course]: 
            The list of courses.
    """
    print("[Notice] Loading course details...")
    # Get the base URL
    baseURL = page.url[:Regex.search(r"(https?://[^/]+)", page.url).end()]
    courses = []

    page.wait_for_selector(
        "d2l-my-courses-card-grid:first-child .course-card-grid d2l-enrollment-card"
    )
    coursesDiv = page.locator("d2l-my-courses-card-grid:first-child .course-card-grid")
    if not coursesDiv:
        raise ValueError("Courses not found!")

    coursesData = []
    for course in coursesDiv.locator("d2l-card").all():
        # Check if href is there
        try:
            href = course.get_attribute("href")
            if not href:
                print("[Warning] No href skipping course...")
                continue

        except: # pylint: disable=bare-except
            print("[Warning] No href skipping course...")
            continue

        # Check if text is there
        try:
            text = course.get_attribute("text")
            if not text:
                print("[Warning] No text skipping course...")
                continue

        except: # pylint: disable=bare-except
            print("[Warning] No text skipping course...")
            continue

        coursesData.append((href, text))

    # Check if there are no courses
    if not coursesData:
        print("[Warning] No courses found!")
        return courses

    print(f"[ignore][Notice] Found {len(coursesData)} courses!")

    # Go through each course
    for course in coursesData:
        # Create a new course object
        newCourse = Course(baseURL)

        try:
            # Fill the course object with the course details
            newCourse.fill(course, page)

        except ValueError as e:
            if "Course code not found" in str(e):
                continue
            raise e

        # Append the course object to the courses list
        print(f"[ignore][Success] {newCourse.name} loaded!")
        courses.append(newCourse)

        del newCourse

    print("[Completed] Course details loaded!")

    # Return results
    return courses


def main(play: Playwright, link: str, username: str, password: str) -> None:
    """
    # Description:
        This function is the main function that runs the program.
        
    ## Args:
        - play (Playwright): 
            The Playwright object.
        - link (str): 
            The link of the page.
        - username (str): 
            The username to login.
        - password (str): 
            The password to login.
    """
    # Initialize the browser
    browser = play.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Go to the classroom page
    page.goto(link)
    page.wait_for_load_state("load")

    # Login
    print("[ignore][Notice] Initalizing...")
    print("[Notice] Logging in...")
    page.get_by_label("Username*").click()
    page.get_by_label("Username*").fill(username)
    page.get_by_label("Password*").click()
    page.get_by_label("Password*").fill(password)
    page.get_by_role("button", name="Login").click()

    # Navigate to the courses "page" / popup
    try:
        page.wait_for_url("https://mycourselink.lakeheadu.ca/d2l/home")
        print("[Notice] Logged in!")

    except Exception as e:
        if page.query_selector("body > div.login-onethird > section > p"):
            raise ValueError("Invaild login credentials!") from e

        raise e

    page.wait_for_load_state("load")
    page.get_by_role("heading", name="View All Courses").click()

    # Get the courses
    courses = getCourses(page)

    # Dump the courses object to a file using json
    saveToFile(courses, SAVEFILE)

    # ---------------------
    context.close()
    browser.close()
    print("[ignore][Success] Data writen to file!")

# Start the program
if __name__ == "__main__":
    if len(sys.argv) >= 3:
        SAVEFILE = sys.argv[3] if len(sys.argv) == 4 else SAVEFILE

        # Check if we are being run by api
        if  len(sys.argv) == 4 and "api" in sys.argv[3]:
            os.environ["SCRAPER_DEBUG"] = "False"
            print("[Notice] Running in API mode!")

        # Start scraping
        with sync_playwright() as playwright:
            print(f"[Notice] Username: {sys.argv[1]}")
            print(f"[Notice] Password: {sys.argv[2]}")
            main(playwright, LINK, sys.argv[1], sys.argv[2])

    else:
        # Start scraping
        with sync_playwright() as playwright:
            main(playwright, LINK, USERNAME, PASSWORD)
