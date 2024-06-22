"""
# Description:
    This module contains the custom print function.
    To enable debugging, set the environment variable "SCRAPER_DEBUG=True" in .env.
    
## Functions:
    - checkFor(item: str, text: str) -> bool: 
        This function checks for the presence of a string in another string.
    - print(*args, **kwargs): 
        This function is used to print the data with rich.
"""
import os
import sys
import re as Regex
from dotenv import load_dotenv
from rich import print as richPrint  # pylint: disable=redefined-builtin

SCRAPER_BRACKETS: bool = True

def checkFor(item: str, text: str) -> bool:
    """
    # Description:
        This function checks for the presence of a string in another string.
    """
    if Regex.search(rf"^[\t\n ]*{item}", text.lower()):
        return True
    return False

def print(*args, **kwargs): # pylint: disable=redefined-builtin
    """
    # Description:
        This function is used to print the data with rich.
    """
    global SCRAPER_BRACKETS, DEBUG # pylint: disable=global-statement

    toPrint: str = str(args[0])
    if DEBUG or checkFor(r"\[ignore\]", toPrint): # pylint: disable=used-before-assignment
        #Check for ignore
        if os.environ.get("SCRAPER_DEBUG") == "False":
            DEBUG = False

        original: str = toPrint.replace("[ignore]", "", 1)

        # Check for notice
        if checkFor(r"\[notice\]", original):
            toPrint = f"[bold]{toPrint}"

        # Check for warning
        if checkFor(r"\[warning\]", original):
            toPrint = f"[bold yellow]{toPrint}"

        # Check for error
        if checkFor(r"\[error\]", original):
            toPrint = f"[bold underline red]{toPrint}"

        # Check for success
        # pylint: disable=too-many-boolean-expressions
        if checkFor(r"\[success\]", original) or \
           checkFor(r"\[completed\]", original) or \
           checkFor(r"\[done\]", original) or \
           checkFor(r"\[saved\]", original) or \
           checkFor(r"\[loaded\]", original) or \
           checkFor(r"\[found\]", original) or \
           checkFor(r"\[obtained\]", original) \
        :
            toPrint = f"[bold green]{toPrint}"

        # Set the args to the new value
        args = (toPrint,)

        ret = richPrint(*args, **kwargs)
        sys.stdout.flush()
        return ret

    return None

# Check if the debugging is enabled
DEBUG: bool = False
# Load the environment variables
dotenv_path=os.path.join(
    os.path.dirname(
        os.path.abspath(__file__)
    ),
    ".env"
)
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path=dotenv_path)
    if os.getenv("SCRAPER_DEBUG") == "True":
        DEBUG = True
        print("[Success] Custom print function debugging enabled!")
        print("[Success] Environment variable \"SCRAPER_DEBUG=True\" enabled!")

# Check if the debugging is enabled
#if not DEBUG:
    # Inform the user that debugging is disabled
    #print("[Notice] Custom print function debugging disabled")
    #print("[Notice] Environment variable \"SCRAPER_DEBUG\" not set or set to \"False\"")
    #print("[Notice] To enable debugging, set the environment variable \"SCRAPER_DEBUG=True\" in .env") # pylint: disable=line-too-long
