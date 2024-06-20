"""
# Description:
    This program scrapes the courses from the Lakehead University's D2L page and 
    turns it into a json file.
"""
import json
import os
import re as Regex
import time

from dotenv import load_dotenv
from playwright.sync_api import Page, Playwright, sync_playwright
from rich import print # pylint: disable=redefined-builtin

from course import Course

# Load the environment variables
load_dotenv(dotenv_path=".env")

# Access the environment variables
LINK = "https://mycourselink.lakeheadu.ca/d2l/home"
USERNAME = os.getenv("USERNAME")
PASSWORD = os.getenv("PASSWORD")
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
    with open(filename, "w", encoding="utf-8") as file:
        json.dump(
            [course.toDict() for course in courses],
            file,
            indent=4
        )

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
    print("Loading course details...")
    # Get the base URL
    baseURL = page.url[:Regex.search(r"(https?://[^/]+)", page.url).end()]
    courses = []

    # Go through each course
    for course in page.locator("a[href^='/d2l/home/']").all():
        # Add time for the page to load
        time.sleep(.25)

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
        courses.append(newCourse)

    print("Course details loaded!")

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
    print("Logging in...")
    page.get_by_label("Username*").click()
    page.get_by_label("Username*").fill(username)
    page.get_by_label("Password*").click()
    page.get_by_label("Password*").fill(password)
    page.get_by_role("button", name="Login").click()

    # Navigate to the courses "page" / popup
    page.wait_for_url("https://mycourselink.lakeheadu.ca/d2l/home")
    print("Logged in!")

    page.wait_for_load_state("load")
    page.get_by_role("heading", name="View All Courses").click()

    # Get the courses
    courses = getCourses(page)

    # Dump the courses object to a file using json
    saveToFile(courses, SAVEFILE)

    # ---------------------
    context.close()
    browser.close()

# Start the program
if __name__ == "__main__":
    # Start scraping
    with sync_playwright() as playwright:
        main(playwright, LINK, USERNAME, PASSWORD)
